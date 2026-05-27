import type { NoteStyle } from '@/types';

/**
 * Render note-style lines onto a canvas.
 * Used for both the PDF export and the live preview.
 */
export function renderNoteStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: NoteStyle,
  options: {
    lineColor?: string;
    opacity?: number;
    lineSpacing?: number;
    gridSize?: number;
    dotDensity?: number;
    marginLeft?: number;
  } = {}
): void {
  const {
    lineColor = '#d1d5db',
    opacity = 0.15,
    lineSpacing = 24,
    gridSize = 20,
    dotDensity = 20,
    marginLeft = 0,
  } = options;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = lineColor;
  ctx.fillStyle = lineColor;
  ctx.lineWidth = 1;

  switch (style) {
    case 'lined':
      renderLinedStyle(ctx, width, height, lineSpacing, marginLeft);
      break;
    case 'dotted':
      renderDottedStyle(ctx, width, height, dotDensity);
      break;
    case 'grid':
      renderGridStyle(ctx, width, height, gridSize);
      break;
    case 'blank':
    default:
      // No pattern
      break;
  }

  ctx.restore();
}

function renderLinedStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing: number,
  marginLeft: number
): void {
  // Draw horizontal lines
  for (let y = spacing; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw margin line if needed
  if (marginLeft > 0) {
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * 1.5; // slightly darker
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(marginLeft, 0);
    ctx.lineTo(marginLeft, height);
    ctx.stroke();
    ctx.restore();
  }
}

function renderDottedStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing: number
): void {
  const radius = 1;
  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderGridStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing: number
): void {
  // Vertical lines
  for (let x = spacing; x < width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  // Horizontal lines
  for (let y = spacing; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * Generate an SVG string for a note style pattern.
 * Useful for CSS backgrounds and live previews.
 */
export function getNoteStyleSvg(
  style: NoteStyle,
  options: {
    lineColor?: string;
    spacing?: number;
    opacity?: number;
  } = {}
): string {
  const {
    lineColor = '#94a3b8',
    spacing = 24,
    opacity = 0.2,
  } = options;

  switch (style) {
    case 'lined':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${spacing}" height="${spacing}">
        <line x1="0" y1="${spacing}" x2="${spacing}" y2="${spacing}" stroke="${lineColor}" stroke-opacity="${opacity}" stroke-width="0.5"/>
      </svg>`;

    case 'dotted':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${spacing}" height="${spacing}">
        <circle cx="${spacing / 2}" cy="${spacing / 2}" r="0.75" fill="${lineColor}" fill-opacity="${opacity}"/>
      </svg>`;

    case 'grid':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${spacing}" height="${spacing}">
        <line x1="${spacing}" y1="0" x2="${spacing}" y2="${spacing}" stroke="${lineColor}" stroke-opacity="${opacity}" stroke-width="0.5"/>
        <line x1="0" y1="${spacing}" x2="${spacing}" y2="${spacing}" stroke="${lineColor}" stroke-opacity="${opacity}" stroke-width="0.5"/>
      </svg>`;

    case 'blank':
    default:
      return '';
  }
}
