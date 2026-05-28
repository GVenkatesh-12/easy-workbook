import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Question, ExportSettings } from "@/types";
import { extractCrop } from "./cropExtractor";
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

  const bgColor = hexToRgb(theme.background);
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
    page.drawText("Easy Workbook", {
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

    // Calculate total space weight for the page
    const totalWeight = pageQuestions.reduce((sum, q) => sum + (q.spaceWeight ?? 1), 0);
    const availableHeight = contentHeight - (pageQuestions.length - 1) * spacing;

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
      let questionImageBytes: Uint8Array;
      try {
        questionImageBytes = await extractCrop(
          question.pageNumber,
          question.questionCrop,
          3,
        );
      } catch {
        // If extraction fails, draw placeholder
        page.drawText(`[${question.label} — Failed to extract]`, {
          x: margins.left + 10,
          y: blockTop - 20,
          size: 10,
          font: font,
          color: headerColor,
        });
        continue;
      }

      const pngImage = await pdfDoc.embedPng(questionImageBytes);
      const imgAspect = pngImage.width / pngImage.height;

      // Apply the user's scale factor so questions have a uniform shape relative to the page
      let imgWidth = contentWidth * (settings.questionImageScale ?? 1.0);
      let imgHeight = imgWidth / imgAspect;

      // Ensure it does not overflow the block height (leaving a tiny margin)
      const maxQuestionHeight = questionBlockHeight * 0.95;

      if (imgHeight > maxQuestionHeight) {
        imgHeight = maxQuestionHeight;
        imgWidth = imgHeight * imgAspect;
      }

      // Question label
      page.drawText(question.label, {
        x: margins.left,
        y: blockTop,
        size: 11,
        font: boldFont,
        color: accentColor,
      });

      // Question border
      page.drawRectangle({
        x: margins.left,
        y: blockTop - imgHeight - 5,
        width: imgWidth,
        height: imgHeight + 5,
        borderColor: borderColor,
        borderWidth: 0.5,
        color: hexToRgb(theme.questionBg),
        opacity: 0.5,
      });

      // Draw question image
      page.drawImage(pngImage, {
        x: margins.left + 4,
        y: blockTop - imgHeight - 2,
        width: imgWidth - 8,
        height: imgHeight - 4,
      });

      // Solving space with note pattern
      if (
        settings.exportType === "practice" ||
        settings.exportType === "combined"
      ) {
        const solveTop = blockTop - imgHeight - spacing;
        const solveBottom = blockTop - questionBlockHeight;

        // Separator line
        page.drawLine({
          start: { x: margins.left, y: solveTop },
          end: { x: margins.left + contentWidth, y: solveTop },
          thickness: 0.5,
          color: borderColor,
          opacity: 0.3,
        });

        // Note pattern in solving area
        drawNotePattern(
          page,
          settings,
          solveTop - 5,
          Math.max(solveBottom, contentBottom),
          theme,
        );
      }

      // Answer (if included)
      if (
        (settings.exportType === "answer-key" ||
          settings.exportType === "combined") &&
        question.answerCrop
      ) {
        try {
          const answerPage = question.answerCrop.pageNumber ?? question.pageNumber;
          const answerBytes = await extractCrop(
            answerPage,
            question.answerCrop,
            3,
          );
          const ansImg = await pdfDoc.embedPng(answerBytes);
          const ansAspect = ansImg.width / ansImg.height;
          let ansW = contentWidth * 0.8;
          let ansH = ansW / ansAspect;
          if (ansH > 100) {
            ansH = 100;
            ansW = ansH * ansAspect;
          }

          const ansY = blockTop - questionBlockHeight + ansH + 10;

          page.drawText("Answer:", {
            x: margins.left,
            y: ansY + 5,
            size: 8,
            font: boldFont,
            color: accentColor,
            opacity: 0.7,
          });

          page.drawImage(ansImg, {
            x: margins.left,
            y: ansY - ansH,
            width: ansW,
            height: ansH,
          });
        } catch {
          // Skip answer if extraction fails
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
