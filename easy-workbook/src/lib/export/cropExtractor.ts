import { pdfManager } from '@/lib/pdf/pdfManager';
import type { CropRegion } from '@/types';

/**
 * Extract a crop region from a PDF page at high resolution.
 * Returns a PNG data URL suitable for embedding in exported PDFs.
 */
export async function extractCrop(
  pageIndex: number,
  crop: CropRegion,
  scale = 3
): Promise<Uint8Array> {
  const canvas = await pdfManager.renderCrop(pageIndex, crop, scale);
  
  // Convert canvas to PNG bytes
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob from crop'));
    }, 'image/png');
  });

  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Extract a crop region as a data URL (for previews).
 */
export async function extractCropAsDataUrl(
  pageIndex: number,
  crop: CropRegion,
  scale = 2
): Promise<string> {
  const canvas = await pdfManager.renderCrop(pageIndex, crop, scale);
  return canvas.toDataURL('image/png');
}
