import { useCallback, useRef, useState } from 'react';
import { pdfManager } from '@/lib/pdf/pdfManager';

interface ThumbnailOptions {
  /** Resolution scale for thumbnail rendering */
  scale?: number;
  /** Maximum dimension in pixels */
  maxDim?: number;
}

/**
 * Hook to generate thumbnails from PDF crop regions.
 */
export function useThumbnail() {
  const [generating, setGenerating] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const generateThumbnail = useCallback(async (
    pageIndex: number,
    crop: { x: number; y: number; width: number; height: number },
    options: ThumbnailOptions = {}
  ): Promise<string> => {
    const { scale = 1, maxDim = 200 } = options;
    const cacheKey = `${pageIndex}-${crop.x.toFixed(3)}-${crop.y.toFixed(3)}-${crop.width.toFixed(3)}-${crop.height.toFixed(3)}`;
    
    // Check cache
    const cached = cacheRef.current.get(cacheKey);
    if (cached) return cached;

    setGenerating(true);
    try {
      const cropCanvas = await pdfManager.renderCrop(pageIndex, crop, scale);

      // Resize to thumbnail dimensions
      const thumbCanvas = document.createElement('canvas');
      const aspectRatio = cropCanvas.width / cropCanvas.height;
      
      if (cropCanvas.width > cropCanvas.height) {
        thumbCanvas.width = Math.min(maxDim, cropCanvas.width);
        thumbCanvas.height = thumbCanvas.width / aspectRatio;
      } else {
        thumbCanvas.height = Math.min(maxDim, cropCanvas.height);
        thumbCanvas.width = thumbCanvas.height * aspectRatio;
      }

      const ctx = thumbCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(cropCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }

      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
      cacheRef.current.set(cacheKey, dataUrl);
      return dataUrl;
    } finally {
      setGenerating(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { generateThumbnail, generating, clearCache };
}
