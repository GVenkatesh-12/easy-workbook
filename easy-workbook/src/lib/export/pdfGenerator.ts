import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
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
 * Embed either JPEG or PNG bytes into the PDF document based on magic bytes.
 */
async function embedImageBytes(pdfDoc: PDFDocument, bytes: Uint8Array) {
  // PNG magic bytes: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return await pdfDoc.embedPng(bytes);
  }
  return await pdfDoc.embedJpg(bytes);
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
 * Draw a premium cover page.
 */
function drawCoverPage(
  pdfDoc: PDFDocument,
  settings: ExportSettings,
  theme: ReturnType<typeof getTheme>,
  font: any,
  boldFont: any,
) {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const pageBgHex = settings.customPageColor && settings.customPageColor.startsWith('#')
    ? settings.customPageColor
    : theme.background;
  const bgColor = hexToRgb(pageBgHex);
  const accentColor = hexToRgb(theme.accent);
  const textColor = hexToRgb(theme.headerText);
  const bodyColor = hexToRgb(theme.bodyText);

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
    color: bgColor,
  });

  const titleText = settings.coverPageTitle || settings.pdfTitle || "Easy Workbook";
  const subtitleText = settings.coverPageSubtitle || "Practice Question Set";
  const subjectText = settings.coverPageSubject || "General";
  const authorText = settings.coverPageAuthor || "Easy Workbook Creator";
  const dateText = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  switch (settings.coverPageTheme) {
    case 'modern': {
      // Modern style with solid accent shape blocks
      page.drawRectangle({
        x: 0,
        y: A4_HEIGHT * 0.6,
        width: A4_WIDTH,
        height: A4_HEIGHT * 0.4,
        color: accentColor,
        opacity: 0.15,
      });

      // Decorative circles
      page.drawCircle({
        x: A4_WIDTH,
        y: A4_HEIGHT * 0.6,
        size: 150,
        color: accentColor,
        opacity: 0.2,
      });
      page.drawCircle({
        x: 0,
        y: A4_HEIGHT * 0.2,
        size: 100,
        color: accentColor,
        opacity: 0.1,
      });

      // Subject Badge
      page.drawRectangle({
        x: 60,
        y: A4_HEIGHT * 0.52,
        width: 120,
        height: 25,
        color: accentColor,
        opacity: 0.9,
      });
      page.drawText(subjectText.toUpperCase(), {
        x: 70,
        y: A4_HEIGHT * 0.52 + 7,
        size: 9,
        font: boldFont,
        color: rgb(1, 1, 1),
      });

      // Main Title
      page.drawText(titleText, {
        x: 60,
        y: A4_HEIGHT * 0.44,
        size: 32,
        font: boldFont,
        color: textColor,
      });

      // Subtitle
      page.drawText(subtitleText, {
        x: 60,
        y: A4_HEIGHT * 0.38,
        size: 16,
        font: font,
        color: bodyColor,
        opacity: 0.8,
      });

      // Bottom separator line
      page.drawLine({
        start: { x: 60, y: A4_HEIGHT * 0.25 },
        end: { x: A4_WIDTH - 60, y: A4_HEIGHT * 0.25 },
        thickness: 2,
        color: accentColor,
        opacity: 0.5,
      });

      // Author & Date
      page.drawText(`Created by: ${authorText}`, {
        x: 60,
        y: A4_HEIGHT * 0.2,
        size: 11,
        font: boldFont,
        color: textColor,
      });
      page.drawText(dateText, {
        x: 60,
        y: A4_HEIGHT * 0.17,
        size: 10,
        font: font,
        color: bodyColor,
        opacity: 0.7,
      });
      break;
    }
    case 'classic': {
      // Classic elegant double frame border
      page.drawRectangle({
        x: 30,
        y: 30,
        width: A4_WIDTH - 60,
        height: A4_HEIGHT - 60,
        borderColor: accentColor,
        borderWidth: 2,
      });
      page.drawRectangle({
        x: 36,
        y: 36,
        width: A4_WIDTH - 72,
        height: A4_HEIGHT - 72,
        borderColor: accentColor,
        borderWidth: 0.75,
        opacity: 0.5,
      });

      // Subject (centered)
      const subWidth = boldFont.widthOfTextAtSize(subjectText.toUpperCase(), 11);
      page.drawText(subjectText.toUpperCase(), {
        x: (A4_WIDTH - subWidth) / 2,
        y: A4_HEIGHT * 0.7,
        size: 11,
        font: boldFont,
        color: accentColor,
      });

      // Title (centered)
      const titleWidth = boldFont.widthOfTextAtSize(titleText, 28);
      page.drawText(titleText, {
        x: (A4_WIDTH - titleWidth) / 2,
        y: A4_HEIGHT * 0.56,
        size: 28,
        font: boldFont,
        color: textColor,
      });

      // Separator decorative line
      page.drawLine({
        start: { x: A4_WIDTH / 2 - 40, y: A4_HEIGHT * 0.51 },
        end: { x: A4_WIDTH / 2 + 40, y: A4_HEIGHT * 0.51 },
        thickness: 1,
        color: accentColor,
      });

      // Subtitle (centered)
      const subtitleWidth = font.widthOfTextAtSize(subtitleText, 14);
      page.drawText(subtitleText, {
        x: (A4_WIDTH - subtitleWidth) / 2,
        y: A4_HEIGHT * 0.46,
        size: 14,
        font: font,
        color: bodyColor,
        opacity: 0.8,
      });

      // Author & Date (centered at bottom)
      const authorWidth = boldFont.widthOfTextAtSize(`By ${authorText}`, 11);
      page.drawText(`By ${authorText}`, {
        x: (A4_WIDTH - authorWidth) / 2,
        y: A4_HEIGHT * 0.22,
        size: 11,
        font: boldFont,
        color: textColor,
      });

      const dateWidth = font.widthOfTextAtSize(dateText, 10);
      page.drawText(dateText, {
        x: (A4_WIDTH - dateWidth) / 2,
        y: A4_HEIGHT * 0.18,
        size: 10,
        font: font,
        color: bodyColor,
        opacity: 0.7,
      });
      break;
    }
    case 'geometric': {
      // Abstract Geometric design
      for (let i = 0; i < 6; i++) {
        page.drawLine({
          start: { x: 0, y: A4_HEIGHT - i * 50 },
          end: { x: A4_WIDTH, y: A4_HEIGHT - (i + 4) * 80 },
          thickness: 3 + i,
          color: accentColor,
          opacity: 0.05 + i * 0.02,
        });
      }

      // Left bar
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 24,
        height: A4_HEIGHT,
        color: accentColor,
      });

      page.drawRectangle({
        x: 50,
        y: A4_HEIGHT * 0.65,
        width: 6,
        height: 80,
        color: accentColor,
      });

      page.drawText(subjectText.toUpperCase(), {
        x: 70,
        y: A4_HEIGHT * 0.7,
        size: 12,
        font: boldFont,
        color: accentColor,
      });

      // Title
      page.drawText(titleText, {
        x: 70,
        y: A4_HEIGHT * 0.52,
        size: 36,
        font: boldFont,
        color: textColor,
      });

      // Subtitle
      page.drawText(subtitleText, {
        x: 70,
        y: A4_HEIGHT * 0.46,
        size: 15,
        font: font,
        color: bodyColor,
        opacity: 0.8,
      });

      // Author & Date
      page.drawText(authorText, {
        x: 70,
        y: A4_HEIGHT * 0.25,
        size: 12,
        font: boldFont,
        color: textColor,
      });
      page.drawText(dateText, {
        x: 70,
        y: A4_HEIGHT * 0.21,
        size: 10,
        font: font,
        color: bodyColor,
        opacity: 0.7,
      });
      break;
    }
    case 'minimal':
    default: {
      // Elegant minimal design
      page.drawLine({
        start: { x: 50, y: 100 },
        end: { x: 50, y: A4_HEIGHT - 100 },
        thickness: 1.5,
        color: accentColor,
        opacity: 0.4,
      });

      // Title
      page.drawText(titleText, {
        x: 80,
        y: A4_HEIGHT * 0.58,
        size: 30,
        font: boldFont,
        color: textColor,
      });

      // Subtitle
      page.drawText(subtitleText, {
        x: 80,
        y: A4_HEIGHT * 0.52,
        size: 14,
        font: font,
        color: bodyColor,
        opacity: 0.8,
      });

      // Subject
      page.drawText(subjectText.toUpperCase(), {
        x: 80,
        y: A4_HEIGHT * 0.46,
        size: 10,
        font: boldFont,
        color: accentColor,
        opacity: 0.9,
      });

      // Author and Date
      page.drawText(`Created by ${authorText}`, {
        x: 80,
        y: 150,
        size: 11,
        font: boldFont,
        color: textColor,
      });
      page.drawText(dateText, {
        x: 80,
        y: 130,
        size: 10,
        font: font,
        color: bodyColor,
        opacity: 0.7,
      });
      break;
    }
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

  // Load custom typography
  let standardFont = StandardFonts.Helvetica;
  let standardBoldFont = StandardFonts.HelveticaBold;
  if (settings.fontFamily === 'times') {
    standardFont = StandardFonts.TimesRoman;
    standardBoldFont = StandardFonts.TimesRomanBold;
  } else if (settings.fontFamily === 'courier') {
    standardFont = StandardFonts.Courier;
    standardBoldFont = StandardFonts.CourierBold;
  }

  const font = await pdfDoc.embedFont(standardFont);
  const boldFont = await pdfDoc.embedFont(standardBoldFont);
  const theme = getTheme(settings.theme);

  const pageBgHex = settings.customPageColor && settings.customPageColor.startsWith('#')
    ? settings.customPageColor
    : theme.background;
  const bgColor = hexToRgb(pageBgHex);
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

  // Draw Cover Page if enabled
  if (settings.includeCoverPage) {
    drawCoverPage(pdfDoc, settings, theme, font, boldFont);
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

    // Watermark Text Overlay
    if (settings.watermarkText) {
      const watermarkColor = hexToRgb(theme.accent);
      const watermarkText = settings.watermarkText;
      const size = settings.watermarkSize || 50;

      const textWidth = boldFont.widthOfTextAtSize(watermarkText, size);
      const textHeight = size * 0.7;
      
      const angle = 45;
      const radians = (angle * Math.PI) / 180;
      
      const x = A4_WIDTH / 2 - (textWidth / 2) * Math.cos(radians) + (textHeight / 2) * Math.sin(radians);
      const y = A4_HEIGHT / 2 - (textWidth / 2) * Math.sin(radians) - (textHeight / 2) * Math.cos(radians);

      page.drawText(watermarkText, {
        x,
        y,
        size,
        font: boldFont,
        color: watermarkColor,
        opacity: settings.watermarkOpacity ?? 0.1,
        rotate: degrees(angle),
      });
    }

    // Header Customization
    // Header Left
    const hLeftText = settings.headerLeft || settings.pdfTitle || "Easy Workbook";
    page.drawText(hLeftText, {
      x: margins.left,
      y: A4_HEIGHT - 30,
      size: 8,
      font: font,
      color: accentColor,
      opacity: 0.5,
    });

    // Header Right
    let hRightText = "";
    if (settings.headerRight === 'page') {
      hRightText = `Page ${pageIdx + 1} / ${pages.length}`;
    } else if (settings.headerRight === 'date') {
      hRightText = new Date().toLocaleDateString();
    } else if (settings.headerRight === 'custom') {
      hRightText = settings.headerRightCustom || "";
    }
    if (hRightText) {
      const hRightWidth = font.widthOfTextAtSize(hRightText, 8);
      page.drawText(hRightText, {
        x: A4_WIDTH - margins.right - hRightWidth,
        y: A4_HEIGHT - 30,
        size: 8,
        font: font,
        color: headerColor,
        opacity: 0.5,
      });
    }

    // Header separator Line
    if (settings.showHeaderLine) {
      page.drawLine({
        start: { x: margins.left, y: A4_HEIGHT - 36 },
        end: { x: A4_WIDTH - margins.right, y: A4_HEIGHT - 36 },
        thickness: 0.5,
        color: borderColor,
        opacity: 0.2,
      });
    }

    // Footer Customization
    // Footer Left
    const fLeftText = settings.footerLeft || "";
    if (fLeftText) {
      page.drawText(fLeftText, {
        x: margins.left,
        y: 25,
        size: 8,
        font: font,
        color: headerColor,
        opacity: 0.4,
      });
    }

    // Footer Right
    let fRightText = "";
    if (settings.footerRight === 'page') {
      fRightText = `Page ${pageIdx + 1} / ${pages.length}`;
    } else if (settings.footerRight === 'date') {
      fRightText = new Date().toLocaleDateString();
    } else if (settings.footerRight === 'custom') {
      fRightText = settings.footerRightCustom || "";
    }
    if (fRightText) {
      const fRightWidth = font.widthOfTextAtSize(fRightText, 8);
      page.drawText(fRightText, {
        x: A4_WIDTH - margins.right - fRightWidth,
        y: 25,
        size: 8,
        font: font,
        color: headerColor,
        opacity: 0.4,
      });
    }

    // Footer separator Line
    if (settings.showFooterLine) {
      page.drawLine({
        start: { x: margins.left, y: 36 },
        end: { x: A4_WIDTH - margins.right, y: 36 },
        thickness: 0.5,
        color: borderColor,
        opacity: 0.2,
      });
    }

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
        A4_HEIGHT - 45, // Start below header line
        45,             // End above footer line
        theme,
      );
    }

    // Calculate total space weight for the page
    const totalWeight = pageQuestions.reduce((sum, q) => sum + (q.spaceWeight ?? 1), 0);
    const availableHeight = contentHeight - (pageQuestions.length - 1) * spacing;

    // Pre-extract all images for this page sequentially
    // Running AI models concurrently crashes the browser due to massive memory usage.
    const preExtractedImages = [];
    for (const question of pageQuestions) {
      // Yield to the main thread so the browser can update the UI and progress bar
      await new Promise(r => setTimeout(r, 50));

      let qBytes: Uint8Array | null = null;
      let aBytes: Uint8Array | null = null;
      try {
        qBytes = await extractMergedCrops(question.questionCrops, 3, settings.invertCropColors, settings.removeBackground, pageBgHex);
      } catch {}
      if (
        (settings.exportType === "answer-key" || settings.exportType === "combined") &&
        question.answerCrops && question.answerCrops.length > 0
      ) {
        try {
          aBytes = await extractMergedCrops(question.answerCrops, 3, settings.invertCropColors, settings.removeBackground, pageBgHex);
        } catch {}
      }
      preExtractedImages.push({ qBytes, aBytes });
    }

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

      const embeddedQImage = await embedImageBytes(pdfDoc, extracted.qBytes);
      const imgAspect = embeddedQImage.width / embeddedQImage.height;

      // Apply the user's scale factor so questions have a uniform shape relative to the page
      // Subtract 8 to account for the border padding
      let imgWidth = (contentWidth - 8) * (settings.questionImageScale ?? 0.5);
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
      page.drawImage(embeddedQImage, {
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

      if (
        (settings.exportType === "answer-key" ||
          settings.exportType === "combined") &&
        question.answerCrops && question.answerCrops.length > 0
      ) {
        if (extracted.aBytes) {
          const ansImg = await embedImageBytes(pdfDoc, extracted.aBytes);
          const ansAspect = ansImg.width / ansImg.height;
          
          // Apply the user's scale factor for answers
          let ansW = contentWidth * (settings.answerImageScale ?? 0.5);
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
