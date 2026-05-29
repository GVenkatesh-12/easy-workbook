import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Question, ExportSettings } from "@/types";
import { extractMergedCrops } from "./cropExtractor";
import { getTheme } from "./themes";

/** A4 dimensions in points */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * Parse hex color to pdf-lib rgb.
 */
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Draw note-style pattern on a PDF page.
 */
function drawNotePattern(
  page: ReturnType<PDFDocument["addPage"]>,
  settings: ExportSettings,
  startY: number,
  endY: number,
  theme: ReturnType<typeof getTheme>,
) {
  const lineColor = hexToRgb(theme.lineColor);
  const { margins, noteStyleOpacity } = settings;

  const left = margins.left;
  const right = A4_WIDTH - margins.right;

  switch (settings.noteStyle) {
    case "lined":
      for (let y = startY; y >= endY; y -= settings.lineSpacing) {
        page.drawLine({
          start: { x: left, y },
          end: { x: right, y },
          thickness: 0.5,
          color: lineColor,
          opacity: noteStyleOpacity,
        });
      }
      break;

    case "dotted":
      for (let x = left; x <= right; x += settings.dotDensity) {
        for (let y = startY; y >= endY; y -= settings.dotDensity) {
          page.drawCircle({
            x,
            y,
            size: 0.8,
            color: lineColor,
            opacity: noteStyleOpacity,
          });
        }
      }
      break;

    case "grid":
      // Vertical
      for (let x = left; x <= right; x += settings.gridSize) {
        page.drawLine({
          start: { x, y: startY },
          end: { x, y: endY },
          thickness: 0.3,
          color: lineColor,
          opacity: noteStyleOpacity,
        });
      }
      // Horizontal
      for (let y = startY; y >= endY; y -= settings.gridSize) {
        page.drawLine({
          start: { x: left, y },
          end: { x: right, y },
          thickness: 0.3,
          color: lineColor,
          opacity: noteStyleOpacity,
        });
      }
      break;

    case "blank":
    default:
      break;
  }
}

/**
 * Generate a practice PDF from selected questions.
 */
export async function generatePdf(
  questions: Question[],
  settings: ExportSettings,
  onProgress?: (progress: number) => void,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const theme = getTheme(settings.theme);

  const bgColor = settings.customPageColor && settings.customPageColor.startsWith('#')
    ? hexToRgb(settings.customPageColor)
    : hexToRgb(theme.background);
  const headerColor = hexToRgb(theme.headerText);
  const borderColor = hexToRgb(theme.border);
  const accentColor = hexToRgb(theme.accent);

  const { margins, questionsPerPage, spacing } = settings;
  const contentWidth = A4_WIDTH - margins.left - margins.right;

  const includedQuestions = questions.filter((q) => q.includedInExport);
  const total = includedQuestions.length;

  // Group questions by page
  const pages: Question[][] = [];
  for (let i = 0; i < total; i += questionsPerPage) {
    pages.push(includedQuestions.slice(i, i + questionsPerPage));
  }

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageQuestions = pages[pageIdx];
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: A4_HEIGHT,
      color: bgColor,
    });

    // Header
    page.drawText(settings.pdfTitle || "Easy Workbook", {
      x: margins.left,
      y: A4_HEIGHT - 30,
      size: 8,
      font: font,
      color: accentColor,
      opacity: 0.5,
    });

    // Page number
    page.drawText(`Page ${pageIdx + 1} / ${pages.length}`, {
      x: A4_WIDTH - margins.right - 80,
      y: A4_HEIGHT - 30,
      size: 8,
      font: font,
      color: headerColor,
      opacity: 0.4,
    });

    // Content area
    const contentTop = A4_HEIGHT - margins.top - 20;
    const contentBottom = margins.bottom;
    const contentHeight = contentTop - contentBottom;

    // Draw full-page note pattern if practice/combined
    if (
      settings.exportType === "practice" ||
      settings.exportType === "combined"
    ) {
      drawNotePattern(
        page,
        settings,
        A4_HEIGHT, // Start from the very top
        0,         // Go to the very bottom
        theme,
      );
    }

    // Calculate total space weight for the page
    const totalWeight = pageQuestions.reduce((sum, q) => sum + (q.spaceWeight ?? 1), 0);
    const availableHeight = contentHeight - (pageQuestions.length - 1) * spacing;

    // Pre-extract all images for this page concurrently
    const preExtractedImages = await Promise.all(
      pageQuestions.map(async (question) => {
        let qBytes: Uint8Array | null = null;
        let aBytes: Uint8Array | null = null;
        try {
          qBytes = await extractMergedCrops(question.questionCrops, 3);
        } catch {}
        if (
          (settings.exportType === "answer-key" || settings.exportType === "combined") &&
          question.answerCrop
        ) {
          try {
            aBytes = await extractMergedCrops([question.answerCrop], 3);
          } catch {}
        }
        return { qBytes, aBytes };
      })
    );

    let currentTop = contentTop;

    for (let qIdx = 0; qIdx < pageQuestions.length; qIdx++) {
      const question = pageQuestions[qIdx];
      const weight = question.spaceWeight ?? 1;
      const questionBlockHeight = (weight / totalWeight) * availableHeight;
      
      const blockTop = currentTop;

      // Report progress
      const overallIdx = pageIdx * questionsPerPage + qIdx;
      onProgress?.(((overallIdx + 1) / total) * 100);

      // Extract question image
      const extracted = preExtractedImages[qIdx];
      
      if (!extracted.qBytes) {
        // If extraction fails, draw placeholder
        page.drawText(`[${question.label} — Failed to extract]`, {
          x: margins.left + 10,
          y: blockTop - 20,
          size: 10,
          font: font,
          color: headerColor,
        });
        currentTop -= (questionBlockHeight + spacing);
        continue;
      }

      const jpgImage = await pdfDoc.embedJpg(extracted.qBytes);
      const imgAspect = jpgImage.width / jpgImage.height;

      // Apply the user's scale factor so questions have a uniform shape relative to the page
      // Subtract 8 to account for the border padding
      let imgWidth = (contentWidth - 8) * (settings.questionImageScale ?? 1.0);
      let imgHeight = imgWidth / imgAspect;

      // Ensure it does not overflow the block height (leaving a tiny margin for border)
      const maxQuestionHeight = questionBlockHeight * 0.95 - 8;

      if (imgHeight > maxQuestionHeight) {
        imgHeight = maxQuestionHeight;
        imgWidth = imgHeight * imgAspect;
      }

      // Left-align the image (with a small 4pt padding from the margin)
      const startX = margins.left + 4;

      // Question label (aligned left)
      page.drawText(question.label, {
        x: margins.left,
        y: blockTop,
        size: 11,
        font: boldFont,
        color: accentColor,
      });

      // Question border (padded by 4pt on all sides)
      page.drawRectangle({
        x: startX - 4,
        y: blockTop - imgHeight - 8,
        width: imgWidth + 8,
        height: imgHeight + 8,
        borderColor: borderColor,
        borderWidth: 0.5,
        color: hexToRgb(theme.questionBg),
        opacity: 0.5,
      });

      // Draw question image
      page.drawImage(jpgImage, {
        x: startX,
        y: blockTop - imgHeight - 4,
        width: imgWidth,
        height: imgHeight,
      });

      // Solving space separator line
      if (
        settings.exportType === "practice" ||
        settings.exportType === "combined"
      ) {
        const solveTop = blockTop - imgHeight - spacing;

        // Separator line
        page.drawLine({
          start: { x: margins.left, y: solveTop },
          end: { x: margins.left + contentWidth, y: solveTop },
          thickness: 0.5,
          color: borderColor,
          opacity: 0.3,
        });
      }

      // Answer (if included)
      if (
        (settings.exportType === "answer-key" ||
          settings.exportType === "combined") &&
        question.answerCrop
      ) {
        if (extracted.aBytes) {
          const ansImg = await pdfDoc.embedJpg(extracted.aBytes);
          const ansAspect = ansImg.width / ansImg.height;
          
          // Apply the user's scale factor for answers
          let ansW = contentWidth * (settings.answerImageScale ?? 1.0);
          let ansH = ansW / ansAspect;
          
          // Ensure it does not overflow the block height
          const maxAnsHeight = questionBlockHeight * 0.95;
          if (ansH > maxAnsHeight) {
            ansH = maxAnsHeight;
            ansW = ansH * ansAspect;
          }

          const ansY = blockTop - questionBlockHeight + ansH + 10;

          // Determine horizontal position
          let startX = margins.left;
          if (settings.answerPosition === 'center') {
            startX = margins.left + (contentWidth - ansW) / 2;
          } else if (settings.answerPosition === 'right') {
            startX = margins.left + contentWidth - ansW;
          }

          page.drawText("Answer:", {
            x: startX,
            y: ansY + 5,
            size: 8,
            font: boldFont,
            color: accentColor,
            opacity: 0.7,
          });

          page.drawImage(ansImg, {
            x: startX,
            y: ansY - ansH,
            width: ansW,
            height: ansH,
          });
        }
      }

      currentTop -= (questionBlockHeight + spacing);
    }
  }

  return pdfDoc.save();
}

/**
 * Trigger download of the generated PDF.
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const pdfBytes = Uint8Array.from(bytes);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
