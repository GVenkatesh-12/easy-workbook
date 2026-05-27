/**
 * Coordinate mapping utilities.
 * All "normalized" coordinates are in the 0-1 range relative to page dimensions.
 * This ensures selection accuracy across different zoom levels.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert screen coordinates to normalized (0-1) coordinates
 * relative to the PDF page element.
 */
export function screenToNormalized(
  screenPoint: Point,
  pageElement: HTMLElement,
  _zoom: number
): Point {
  const rect = pageElement.getBoundingClientRect();
  return {
    x: (screenPoint.x - rect.left) / rect.width,
    y: (screenPoint.y - rect.top) / rect.height,
  };
}

/**
 * Convert normalized (0-1) coordinates to screen coordinates
 * relative to the PDF page element.
 */
export function normalizedToScreen(
  normalizedPoint: Point,
  pageElement: HTMLElement,
  _zoom: number
): Point {
  const rect = pageElement.getBoundingClientRect();
  return {
    x: normalizedPoint.x * rect.width + rect.left,
    y: normalizedPoint.y * rect.height + rect.top,
  };
}

/**
 * Convert a Konva stage-local position to normalized coordinates.
 * The stage is sized to match the page display dimensions.
 */
export function stageToNormalized(
  stagePoint: Point,
  stageWidth: number,
  stageHeight: number
): Point {
  return {
    x: stagePoint.x / stageWidth,
    y: stagePoint.y / stageHeight,
  };
}

/**
 * Convert normalized coordinates to Konva stage coordinates.
 */
export function normalizedToStage(
  normalizedPoint: Point,
  stageWidth: number,
  stageHeight: number
): Point {
  return {
    x: normalizedPoint.x * stageWidth,
    y: normalizedPoint.y * stageHeight,
  };
}

/**
 * Convert a normalized rect to stage coordinates.
 */
export function normalizedRectToStage(
  rect: Rect,
  stageWidth: number,
  stageHeight: number
): Rect {
  return {
    x: rect.x * stageWidth,
    y: rect.y * stageHeight,
    width: rect.width * stageWidth,
    height: rect.height * stageHeight,
  };
}

/**
 * Convert a stage rect to normalized coordinates.
 */
export function stageRectToNormalized(
  rect: Rect,
  stageWidth: number,
  stageHeight: number
): Rect {
  return {
    x: rect.x / stageWidth,
    y: rect.y / stageHeight,
    width: rect.width / stageWidth,
    height: rect.height / stageHeight,
  };
}

/**
 * Clamp a rect to stay within 0-1 normalized bounds.
 */
export function clampNormalizedRect(rect: Rect): Rect {
  const x = Math.max(0, Math.min(1, rect.x));
  const y = Math.max(0, Math.min(1, rect.y));
  const width = Math.min(rect.width, 1 - x);
  const height = Math.min(rect.height, 1 - y);
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

/**
 * Check if a rect has meaningful area (not just a click).
 */
export function hasArea(rect: Rect, minArea = 0.001): boolean {
  return rect.width * rect.height > minArea;
}
