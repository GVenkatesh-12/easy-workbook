import sharp from 'sharp';

interface NormalizeOptions {
  maxWidth: number;
  trimWhitespace: boolean;
  padding: number;
}

/**
 * Normalize a crop image using sharp.
 * - Trim whitespace borders
 * - Resize to max width
 * - Add padding
 * - Export as PNG
 */
export async function normalizeImage(
  buffer: Buffer,
  options: NormalizeOptions
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Trim whitespace if requested
  if (options.trimWhitespace) {
    pipeline = pipeline.trim();
  }

  // Get metadata to calculate resize
  const metadata = await pipeline.metadata();
  const currentWidth = metadata.width || 800;

  // Resize if wider than max
  if (currentWidth > options.maxWidth) {
    pipeline = pipeline.resize(options.maxWidth, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Add padding
  if (options.padding > 0) {
    pipeline = pipeline.extend({
      top: options.padding,
      bottom: options.padding,
      left: options.padding,
      right: options.padding,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
  }

  return pipeline.png().toBuffer();
}
