import { pdfManager } from '@/lib/pdf/pdfManager';
import type { CropRegion } from '@/types';

/**
 * Extract multiple crop regions and merge them vertically into a single PNG.
 */
export async function extractMergedCrops(
  crops: CropRegion[],
  scale = 3,
  invertColors = false,
  removeBackgroundFlag = false,
  bgColor = '#ffffff'
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
      finalCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png');
    });
    
    if (removeBackgroundFlag) {
      try {
        const bgConfig: any = {
          model: 'medium',
          progress: (key: string, current: number, total: number) => {
            console.log(`[AI Model] ${key}: ${Math.round((current / total) * 100)}%`);
          }
        };
        const { removeBackground } = await import('@imgly/background-removal');
        const transparentBlob = await removeBackground(blob, bgConfig);
        
        const img = new Image();
        const objUrl = URL.createObjectURL(transparentBlob);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = objUrl;
        });
        
        const flatCanvas = document.createElement('canvas');
        flatCanvas.width = img.width;
        flatCanvas.height = img.height;
        const flatCtx = flatCanvas.getContext('2d');
        if (flatCtx) {
          flatCtx.fillStyle = bgColor;
          flatCtx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
          flatCtx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(objUrl);
        
        const flatBlob = await new Promise<Blob>((resolve, reject) => {
          flatCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to flatten blob')), 'image/jpeg', 0.85);
        });
        
        return new Uint8Array(await flatBlob.arrayBuffer());
      } catch (err) {
        console.error("Background removal failed:", err);
      }
    }
    
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
    mergedCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create merged blob')), 'image/png');
  });

  if (removeBackgroundFlag) {
    try {
      const bgConfig: any = {
        model: 'medium',
        progress: (key: string, current: number, total: number) => {
          console.log(`[AI Model] ${key}: ${Math.round((current / total) * 100)}%`);
        }
      };
      const { removeBackground } = await import('@imgly/background-removal');
      const transparentBlob = await removeBackground(blob, bgConfig);
      
      const img = new Image();
      const objUrl = URL.createObjectURL(transparentBlob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objUrl;
      });
      
      const flatCanvas = document.createElement('canvas');
      flatCanvas.width = img.width;
      flatCanvas.height = img.height;
      const flatCtx = flatCanvas.getContext('2d');
      if (flatCtx) {
        flatCtx.fillStyle = bgColor;
        flatCtx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
        flatCtx.drawImage(img, 0, 0);
      }
      URL.revokeObjectURL(objUrl);
      
      const flatBlob = await new Promise<Blob>((resolve, reject) => {
        flatCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to flatten blob')), 'image/jpeg', 0.85);
      });
      
      return new Uint8Array(await flatBlob.arrayBuffer());
    } catch (err) {
      console.error("Background removal failed:", err);
    }
  }

  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Extract multiple crop regions as a single data URL (for previews).
 */
export async function extractMergedCropsAsDataUrl(
  crops: CropRegion[],
  scale = 2,
  invertColors = false,
  removeBackgroundFlag = false,
  bgColor = '#ffffff'
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
    if (removeBackgroundFlag) {
      const blob = await new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png');
      });
      try {
        const bgConfig: any = {
          model: 'medium',
          progress: (key: string, current: number, total: number) => {
            console.log(`[AI Model] ${key}: ${Math.round((current / total) * 100)}%`);
          }
        };
        const { removeBackground } = await import('@imgly/background-removal');
        const transparentBlob = await removeBackground(blob, bgConfig);
        
        const img = new Image();
        const objUrl = URL.createObjectURL(transparentBlob);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = objUrl;
        });
        
        const flatCanvas = document.createElement('canvas');
        flatCanvas.width = img.width;
        flatCanvas.height = img.height;
        const flatCtx = flatCanvas.getContext('2d');
        if (flatCtx) {
          flatCtx.fillStyle = bgColor;
          flatCtx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
          flatCtx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(objUrl);
        
        const flatBlob = await new Promise<Blob>((resolve, reject) => {
          flatCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to flatten blob')), 'image/jpeg', 0.85);
        });
        
        const buffer = await flatBlob.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        return `data:image/jpeg;base64,${base64}`;
      } catch (err) {
        console.error("Background removal failed:", err);
      }
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

  if (removeBackgroundFlag) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      mergedCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png');
    });
    try {
      const bgConfig: any = {
        model: 'medium',
        progress: (key: string, current: number, total: number) => {
          console.log(`[AI Model] ${key}: ${Math.round((current / total) * 100)}%`);
        }
      };
      const { removeBackground } = await import('@imgly/background-removal');
      const transparentBlob = await removeBackground(blob, bgConfig);
      
      const img = new Image();
      const objUrl = URL.createObjectURL(transparentBlob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objUrl;
      });
      
      const flatCanvas = document.createElement('canvas');
      flatCanvas.width = img.width;
      flatCanvas.height = img.height;
      const flatCtx = flatCanvas.getContext('2d');
      if (flatCtx) {
        flatCtx.fillStyle = bgColor;
        flatCtx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
        flatCtx.drawImage(img, 0, 0);
      }
      URL.revokeObjectURL(objUrl);
      
      const flatBlob = await new Promise<Blob>((resolve, reject) => {
        flatCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to flatten blob')), 'image/jpeg', 0.85);
      });
      
      const buffer = await flatBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      return `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      console.error("Background removal failed:", err);
    }
  }

  return mergedCanvas.toDataURL('image/jpeg', 0.85);
}
