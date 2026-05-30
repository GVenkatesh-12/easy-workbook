import { pdfManager } from '@/lib/pdf/pdfManager';
import type { CropRegion } from '@/types';

/**
 * Extract multiple crop regions and merge them vertically into a single PNG.
 */
export async function extractMergedCrops(
  crops: CropRegion[],
  scale = 3,
  invertColors = false
): Promise<Uint8Array> {
  if (crops.length === 0) {
    throw new Error('No crops provided for extraction');
  }

  // Render each crop to an HTMLCanvasElement
  const canvases = await Promise.all(
    crops.map(crop => pdfManager.renderCrop(crop.pageNumber ?? 0, crop, scale))
  );

  if (canvases.length === 1) {
    const canvas = canvases[0];
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = invertColors ? '#18181b' : 'white'; // Use a dark gray/off-black for better contrast
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      if (invertColors) ctx.filter = 'invert(1) hue-rotate(180deg)';
      ctx.drawImage(canvas, 0, 0);
      if (invertColors) ctx.filter = 'none';
    }
    const blob = await new Promise<Blob>((resolve, reject) => {
      finalCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.85);
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Calculate merged dimensions
  const maxWidth = Math.max(...canvases.map(c => c.width));
  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);

  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = maxWidth;
  mergedCanvas.height = totalHeight;
  const ctx = mergedCanvas.getContext('2d');

  if (ctx) {
    // Fill with background
    ctx.fillStyle = invertColors ? '#18181b' : 'white';
    ctx.fillRect(0, 0, maxWidth, totalHeight);

    if (invertColors) ctx.filter = 'invert(1) hue-rotate(180deg)';

    let currentY = 0;
    for (const c of canvases) {
      // Center each part horizontally
      const dx = (maxWidth - c.width) / 2;
      ctx.drawImage(c, dx, currentY);
      currentY += c.height;
    }

    if (invertColors) ctx.filter = 'none';
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    mergedCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create merged blob')), 'image/jpeg', 0.85);
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Extract multiple crop regions as a single data URL (for previews).
 */
export async function extractMergedCropsAsDataUrl(
  crops: CropRegion[],
  scale = 2,
  invertColors = false
): Promise<string> {
  if (crops.length === 0) return '';
  
  if (crops.length === 1) {
    const canvas = await pdfManager.renderCrop(crops[0].pageNumber ?? 0, crops[0], scale);
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = invertColors ? '#18181b' : 'white';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      if (invertColors) ctx.filter = 'invert(1) hue-rotate(180deg)';
      ctx.drawImage(canvas, 0, 0);
      if (invertColors) ctx.filter = 'none';
    }
    return finalCanvas.toDataURL('image/jpeg', 0.85);
  }

  // For multiple crops, we can just use the same logic as above
  const canvases = await Promise.all(
    crops.map(crop => pdfManager.renderCrop(crop.pageNumber ?? 0, crop, scale))
  );

  const maxWidth = Math.max(...canvases.map(c => c.width));
  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);

  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = maxWidth;
  mergedCanvas.height = totalHeight;
  const ctx = mergedCanvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = invertColors ? '#18181b' : 'white';
    ctx.fillRect(0, 0, maxWidth, totalHeight);

    if (invertColors) ctx.filter = 'invert(1) hue-rotate(180deg)';

    let currentY = 0;
    for (const c of canvases) {
      const dx = (maxWidth - c.width) / 2;
      ctx.drawImage(c, dx, currentY);
      currentY += c.height;
    }

    if (invertColors) ctx.filter = 'none';
  }

  return mergedCanvas.toDataURL('image/jpeg', 0.85);
}
