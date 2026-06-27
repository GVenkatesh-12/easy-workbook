import { pdfManager } from '../pdf/pdfManager';
import type { TextItem } from '../pdf/pdfManager';
import type { CropRegion } from '@/types';
import { ocrManager } from './ocrManager';

export interface DetectedQuestion {
  id: string;
  label: string;
  regions: CropRegion[];
  confidence: number;
  pageIndex: number;
}

export interface DetectionProgress {
  current: number;
  total: number;
  phase: string;
}

export interface DetectionOptions {
  padding: number; // e.g. 0.015 for 1.5% padding
  onProgress?: (progress: DetectionProgress) => void;
  patterns?: RegExp[];
}

// Default regex patterns to match question numbers at the start of a block/line
const DEFAULT_PATTERNS = [
  /^\s*(?:Question|Q|Pr|Prob|Problem|S|Ex|Exer)\.?\s*(\d+)\b/i, // Q1, Question 1, Prob 1
  /^\s*(\d+)\s*[.)-](?:\s+|[A-Z]|$)/i,                          // 1., 1) (optional space if followed by capital letter)
  /^\s*\((\d+)\)(?:\s+|[A-Z]|$)/i,                             // (1)
  /^\s*(\d{1,3})\s+[A-Z]/,                                      // 1 What, 12 Simplify (number followed by space and capital letter)
];

type ColumnName = 'left' | 'right' | 'full';

interface CandidateQuestion {
  label: string;
  itemIndex: number;
  y: number;
  score: number;
  column: ColumnName;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const PAGE_TOP_NOISE = 0.025;
const PAGE_BOTTOM_NOISE = 0.94;
const QUESTION_GAP = 0.012;
const MIN_QUESTION_HEIGHT = 0.035;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function itemRight(item: TextItem): number {
  return item.x + Math.max(0, item.width);
}

function itemBottom(item: TextItem): number {
  return item.y + Math.max(0, item.height);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp((sorted.length - 1) * q, 0, sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function getLineHeight(items: TextItem[]): number {
  const heights = items
    .map((item) => item.height)
    .filter((height) => height > 0.002 && height < 0.08);
  return clamp(median(heights) || 0.018, 0.01, 0.035);
}

function getColumn(item: TextItem, gutter: number | null): ColumnName {
  if (gutter === null) return 'full';
  return item.x < gutter ? 'left' : 'right';
}

function getColumnItems(items: TextItem[], gutter: number | null, column: ColumnName): TextItem[] {
  if (gutter === null || column === 'full') return items;
  return items.filter((item) => getColumn(item, gutter) === column);
}

function getColumnBounds(items: TextItem[], gutter: number | null, column: ColumnName): { minX: number; maxX: number } {
  if (gutter !== null) {
    return column === 'left'
      ? { minX: 0.025, maxX: gutter - 0.008 }
      : { minX: gutter + 0.008, maxX: 0.975 };
  }

  const xs = items.map((item) => item.x).filter(Number.isFinite);
  const rights = items.map(itemRight).filter(Number.isFinite);
  if (xs.length < 4 || rights.length < 4) {
    return { minX: 0.035, maxX: 0.965 };
  }

  // Keep broad bounds for diagrams/tables, but trim obvious page margins.
  return {
    minX: clamp(Math.min(0.035, quantile(xs, 0.05) - 0.015), 0.02, 0.08),
    maxX: clamp(Math.max(0.965, quantile(rights, 0.95) + 0.015), 0.92, 0.98),
  };
}

function isLikelyFooterItem(item: TextItem): boolean {
  const text = normalizeText(item.text);
  if (item.y < 0.86) return false;
  return /^\d{1,4}$/.test(text)
    || /^page\s+\d+/i.test(text)
    || /^\d+\s*\/\s*\d+$/.test(text);
}

function findFooterTop(items: TextItem[]): number | null {
  const footerItems = items.filter(isLikelyFooterItem);
  if (footerItems.length === 0) return null;
  return Math.min(...footerItems.map((item) => item.y));
}

function scoreQuestionCandidate(
  item: TextItem,
  orderedItems: TextItem[],
  itemIndex: number,
  patternIndex: number,
  gutter: number | null,
): number {
  const text = normalizeText(item.text);
  const column = getColumn(item, gutter);
  const columnItems = getColumnItems(orderedItems, gutter, column);
  const columnStart = quantile(columnItems.map((colItem) => colItem.x), 0.12);
  const lineHeight = getLineHeight(columnItems);

  let score = 0.55;

  if (patternIndex === 0) score += 0.28;
  if (patternIndex === 1 || patternIndex === 2) score += 0.2;
  if (patternIndex === 3) score += 0.04;

  const leftOffset = item.x - columnStart;
  if (leftOffset <= 0.035) score += 0.16;
  else if (leftOffset <= 0.075) score += 0.08;
  else if (leftOffset > 0.16) score -= 0.18;

  if (item.y < PAGE_TOP_NOISE && patternIndex >= 3) score -= 0.3;
  if (item.y > 0.88) score -= 0.25;
  if (text.length > 140) score -= 0.08;

  const nextItems = orderedItems
    .slice(itemIndex + 1, itemIndex + 5)
    .filter((next) => getColumn(next, gutter) === column);
  const hasNearbyContinuation = nextItems.some((next) => {
    const verticalGap = next.y - item.y;
    return verticalGap >= -lineHeight * 0.5 && verticalGap < Math.max(0.065, lineHeight * 3.2);
  });
  if (hasNearbyContinuation) score += 0.09;

  // Bare "12 Title" style matches are useful, but they are also the easiest
  // to confuse with headings. Make them prove they look like a question line.
  if (patternIndex === 3 && !/[?.:=]/.test(text) && !hasNearbyContinuation) {
    score -= 0.18;
  }

  return clamp(score, 0, 0.99);
}

function isInkPixel(data: Uint8ClampedArray, index: number): boolean {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];

  if (a < 24) return false;

  // White/light paper backgrounds should not count as content. This still
  // catches black text, colored annotations, diagrams, and table lines.
  const brightness = (r + g + b) / 3;
  const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness < 238 || (brightness < 248 && colorSpread > 16);
}

function detectInkBounds(canvas: HTMLCanvasElement, search: Bounds): Bounds | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const startX = clamp(Math.floor(search.minX * canvas.width), 0, canvas.width - 1);
  const endX = clamp(Math.ceil(search.maxX * canvas.width), startX + 1, canvas.width);
  const startY = clamp(Math.floor(search.minY * canvas.height), 0, canvas.height - 1);
  const endY = clamp(Math.ceil(search.maxY * canvas.height), startY + 1, canvas.height);
  const width = endX - startX;
  const height = endY - startY;

  if (width <= 2 || height <= 2) return null;

  const image = ctx.getImageData(startX, startY, width, height);
  const { data } = image;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 420));

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let inkCount = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      if (!isInkPixel(data, index)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      inkCount++;
    }
  }

  if (inkCount < 8 || maxX < minX || maxY < minY) return null;

  return {
    minX: (startX + minX) / canvas.width,
    minY: (startY + minY) / canvas.height,
    maxX: (startX + maxX + step) / canvas.width,
    maxY: (startY + maxY + step) / canvas.height,
  };
}

function mergeBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function getTextBounds(items: TextItem[]): Bounds | null {
  if (items.length === 0) return null;
  return {
    minX: Math.min(...items.map((item) => item.x)),
    minY: Math.min(...items.map((item) => item.y)),
    maxX: Math.max(...items.map(itemRight)),
    maxY: Math.max(...items.map(itemBottom)),
  };
}

/**
 * Detect columns on a page based on X coordinates of text items.
 * Returns column gutter X coordinate if two-column layout is found, otherwise null.
 */
function detectColumnGutter(items: TextItem[]): number | null {
  if (items.length < 15) return null;

  // Group items by Y to find lines
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.008) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const lineStarts: number[] = [];
  let currentY = -1;

  sorted.forEach(item => {
    if (currentY === -1 || Math.abs(item.y - currentY) >= 0.008) {
      lineStarts.push(item.x);
      currentY = item.y;
    }
  });

  const totalLines = lineStarts.length;
  if (totalLines < 6) return null;

  // Count lines starting in the left column vs right column region
  const leftStarts = lineStarts.filter(x => x < 0.4).length;
  const rightStarts = lineStarts.filter(x => x >= 0.45 && x < 0.85).length;

  // If at least 15% of the lines start in the right column, it is a two-column page
  if (rightStarts / totalLines > 0.15 && leftStarts / totalLines > 0.3) {
    return 0.48; // Midpoint gutter separator
  }

  return null;
}

/**
 * Sort and reconstruct reading order for text items on a page.
 */
function reconstructReadingOrder(items: TextItem[]): TextItem[] {
  if (items.length === 0) return [];

  const gutter = detectColumnGutter(items);
  
  if (gutter !== null) {
    // Two-column layout: separate items into left and right, reconstruct reading order for each, then combine
    const leftItems = items.filter(item => item.x < gutter);
    const rightItems = items.filter(item => item.x >= gutter);

    return [
      ...reconstructLines(leftItems),
      ...reconstructLines(rightItems)
    ];
  } else {
    // Single column layout
    return reconstructLines(items);
  }
}

/**
 * Helper to group items by Y coordinate (into lines) and sort them left-to-right.
 */
function reconstructLines(items: TextItem[]): TextItem[] {
  if (items.length === 0) return [];

  // Sort primarily by Y, then by X
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.008) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [];

  sorted.forEach(item => {
    if (currentLine.length === 0) {
      currentLine.push(item);
    } else {
      const prev = currentLine[currentLine.length - 1];
      // If Y difference is small, group in same line
      if (Math.abs(item.y - prev.y) < 0.008) {
        currentLine.push(item);
      } else {
        lines.push(currentLine);
        currentLine = [item];
      }
    }
  });
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Merge items inside each line into single merged text items with combined bounding boxes
  const mergedItems: TextItem[] = [];
  lines.forEach(line => {
    if (line.length === 0) return;
    
    // Sort items by X in this line
    line.sort((a, b) => a.x - b.x);

    let currentMerged: TextItem | null = null;

    line.forEach(item => {
      if (!currentMerged) {
        currentMerged = { ...item };
      } else {
        // If distance between items is small, merge them
        const distance = item.x - (currentMerged.x + currentMerged.width);
        if (distance < 0.05) {
          currentMerged.text += ' ' + item.text;
          currentMerged.width = (item.x + item.width) - currentMerged.x;
          currentMerged.height = Math.max(currentMerged.height, item.height);
        } else {
          mergedItems.push(currentMerged);
          currentMerged = { ...item };
        }
      }
    });

    if (currentMerged) {
      mergedItems.push(currentMerged);
    }
  });

  return mergedItems;
}

/**
 * Detect questions across all PDF pages.
 */
export async function detectQuestions(
  totalPages: number,
  options: DetectionOptions = { padding: 0.015 }
): Promise<{ questions: DetectedQuestion[]; usedOcr: boolean }> {
  const { padding, onProgress } = options;
  const patterns = options.patterns || DEFAULT_PATTERNS;
  const detectedList: DetectedQuestion[] = [];
  let usedOcr = false;

  try {
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (onProgress) {
        onProgress({
          current: pageIdx + 1,
          total: totalPages,
          phase: `Analyzing Page ${pageIdx + 1}...`,
        });
      }

      let textItems: TextItem[] = [];
      try {
        textItems = await pdfManager.getTextContent(pageIdx);
      } catch (err) {
        console.warn(`Failed to extract text layer on page ${pageIdx}:`, err);
      }

      // If text items are sparse, trigger OCR fallback
      if (textItems.length < 5) {
        if (onProgress) {
          onProgress({
            current: pageIdx + 1,
            total: totalPages,
            phase: `No text layer found. Running OCR on Page ${pageIdx + 1}...`,
          });
        }
        try {
          usedOcr = true;
          ocrManager.onProgress = (ocrProgress) => {
            if (onProgress) {
              onProgress({
                current: pageIdx + 1,
                total: totalPages,
                phase: `OCR Page ${pageIdx + 1}: ${ocrProgress.status} (${Math.round(ocrProgress.progress * 100)}%)`,
              });
            }
          };

          // Render page to canvas at 2x resolution
          const canvas = await pdfManager.renderPageToImage(pageIdx, 2);
          const dims = await pdfManager.getPageDimensions(pageIdx);
          
          textItems = await ocrManager.recognizePage(canvas, dims.height);
        } catch (ocrErr) {
          console.error(`OCR failed on page ${pageIdx}:`, ocrErr);
        }
      }

      if (textItems.length === 0) continue;

      // Reconstruct logical reading order
      const orderedItems = reconstructReadingOrder(textItems);
      const gutter = detectColumnGutter(textItems);
      const lineHeight = getLineHeight(orderedItems);

      // Find question starts
      const pageQuestions: CandidateQuestion[] = [];

      orderedItems.forEach((item, idx) => {
        const text = normalizeText(item.text);
        if (!text || item.y > PAGE_BOTTOM_NOISE || isLikelyFooterItem(item)) return;

        for (const [patternIndex, pattern] of patterns.entries()) {
          const match = item.text.match(pattern);
          if (match) {
            const label = match[1] ? `Q${match[1]}` : `Q${pageQuestions.length + 1}`;
            const score = scoreQuestionCandidate(item, orderedItems, idx, patternIndex, gutter);
            if (score >= 0.58) {
              pageQuestions.push({
                label,
                itemIndex: idx,
                y: item.y,
                score,
                column: getColumn(item, gutter),
              });
            }
            break;
          }
        }
      });

      // Post-process detected questions to remove duplicates
      const uniquePageQuestions: CandidateQuestion[] = [];
      pageQuestions.forEach(q => {
        const duplicateIndex = uniquePageQuestions.findIndex(existing => {
          if (q.column !== existing.column) return false;
          const sameLine = Math.abs(q.y - existing.y) < Math.max(0.026, lineHeight * 1.4);
          const sameNearbyLabel = q.label === existing.label && Math.abs(q.y - existing.y) < 0.12;
          return sameLine || sameNearbyLabel;
        });

        if (duplicateIndex === -1) {
          uniquePageQuestions.push(q);
        } else if (q.score > uniquePageQuestions[duplicateIndex].score) {
          uniquePageQuestions[duplicateIndex] = q;
        }
      });

      uniquePageQuestions.sort((a, b) => a.itemIndex - b.itemIndex);

      let pageCanvas: HTMLCanvasElement | null = null;
      if (uniquePageQuestions.length > 0) {
        try {
          if (onProgress) {
            onProgress({
              current: pageIdx + 1,
              total: totalPages,
              phase: `Refining crops on Page ${pageIdx + 1}...`,
            });
          }
          pageCanvas = await pdfManager.renderPageToImage(pageIdx, 1.35);
        } catch (renderErr) {
          console.warn(`Visual crop refinement failed on page ${pageIdx}:`, renderErr);
        }
      }

      uniquePageQuestions.forEach((q, idx) => {
        const startItemIdx = q.itemIndex;
        const currentItem = orderedItems[startItemIdx];
        if (!currentItem) return;

        if (q.y > 0.92 || isLikelyFooterItem(currentItem)) return;

        const currentColumn = q.column;
        const columnItems = getColumnItems(orderedItems, gutter, currentColumn);
        const footerTop = findFooterTop(columnItems);

        let nextQuestionY = footerTop !== null
          ? Math.max(q.y + MIN_QUESTION_HEIGHT, footerTop - QUESTION_GAP)
          : PAGE_BOTTOM_NOISE;
        for (let j = idx + 1; j < uniquePageQuestions.length; j++) {
          const nextQ = uniquePageQuestions[j];
          if (nextQ.column === currentColumn) {
            nextQuestionY = nextQ.y;
            break;
          }
        }

        const maxSearchY = clamp(
          nextQuestionY - QUESTION_GAP,
          q.y + MIN_QUESTION_HEIGHT,
          footerTop !== null ? footerTop - QUESTION_GAP : PAGE_BOTTOM_NOISE,
        );
        const columnBounds = getColumnBounds(orderedItems, gutter, currentColumn);
        const bandItems = columnItems.filter((item) => {
          if (isLikelyFooterItem(item)) return false;
          return itemBottom(item) >= q.y - lineHeight * 0.6 && item.y < maxSearchY + lineHeight * 0.35;
        });

        const textBounds = getTextBounds(bandItems.length > 0 ? bandItems : [currentItem]);
        if (!textBounds) return;

        const searchBounds: Bounds = {
          minX: columnBounds.minX,
          minY: clamp(q.y - Math.max(0.006, padding), 0, 1),
          maxX: columnBounds.maxX,
          maxY: maxSearchY,
        };
        const inkBounds = pageCanvas ? detectInkBounds(pageCanvas, searchBounds) : null;

        let contentBounds = textBounds;
        if (inkBounds && inkBounds.maxY - inkBounds.minY >= 0.008) {
          contentBounds = mergeBounds(contentBounds, inkBounds);
        }

        if (contentBounds.maxY - contentBounds.minY < 0.008 && q.score < 0.75) return;

        const xPadding = Math.max(0.006, padding * 0.75);
        const yPadding = Math.max(0.004, padding * 0.75);
        let minX = clamp(contentBounds.minX - xPadding, columnBounds.minX, columnBounds.maxX);
        let maxX = clamp(contentBounds.maxX + xPadding, minX + 0.04, columnBounds.maxX);
        const minWidth = gutter === null ? 0.24 : 0.14;

        if (maxX - minX < minWidth) {
          const extra = (minWidth - (maxX - minX)) / 2;
          minX = clamp(minX - extra, columnBounds.minX, columnBounds.maxX - minWidth);
          maxX = clamp(maxX + extra, minX + minWidth, columnBounds.maxX);
        }

        const minY = clamp(Math.min(q.y, contentBounds.minY) - yPadding, 0, 1);
        const maxY = clamp(
          contentBounds.maxY + yPadding,
          minY + MIN_QUESTION_HEIGHT,
          Math.min(1, maxSearchY),
        );

        const paddedRect: CropRegion = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
          pageNumber: pageIdx,
        };

        // Create UUID
        const id = typeof crypto.randomUUID === 'function' 
          ? crypto.randomUUID() 
          : `detected-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        detectedList.push({
          id,
          label: q.label,
          regions: [paddedRect],
          confidence: clamp(q.score + (inkBounds ? 0.04 : 0), 0.55, 0.98),
          pageIndex: pageIdx,
        });
      });

      // Handle cross-page questions:
      // If the last question on this page exists, check if there is text at the top of the next page before any question starts.
      // For simplicity, standard auto-cropping will detect per page, but users can manual select parts.
      // We will allow users to adjust/stitch parts manually using existing "Add Part" button.
    }
  } finally {
    // Terminate OCR worker to free resources
    await ocrManager.terminate();
  }

  return {
    questions: detectedList,
    usedOcr,
  };
}
