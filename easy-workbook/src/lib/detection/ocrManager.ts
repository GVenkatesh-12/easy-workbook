import { createWorker } from 'tesseract.js';
import type { TextItem } from '../pdf/pdfManager';

class OcrManager {
  private worker: any = null;
  private isInitializing = false;
  public onProgress: ((progress: { status: string; progress: number }) => void) | null = null;

  private async getWorker() {
    if (this.worker) return this.worker;
    if (this.isInitializing) {
      // Wait a bit and try again
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.worker) return this.worker;
    }

    this.isInitializing = true;
    try {
      if (this.onProgress) {
        this.onProgress({ status: 'Loading OCR engine...', progress: 0.1 });
      }
      
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (this.onProgress && m.status === 'recognizing text') {
            this.onProgress({ status: 'Running OCR...', progress: m.progress });
          }
        },
      });

      this.worker = worker;
      return this.worker;
    } catch (error) {
      console.error('Failed to initialize Tesseract worker:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Run OCR on a canvas and return normalized text items.
   */
  async recognizePage(
    canvas: HTMLCanvasElement,
    pageHeight: number
  ): Promise<TextItem[]> {
    const worker = await this.getWorker();
    
    if (this.onProgress) {
      this.onProgress({ status: 'Processing page image...', progress: 0.0 });
    }

    const { data } = await worker.recognize(canvas, {}, {
      blocks: true,
      hocr: false,
      tsv: false,
    });

    const words = data.words || [];
    
    // Tesseract coordinates are in canvas pixels. We need to normalize them (0 to 1)
    // relative to the canvas dimensions.
    return words.map((word: any) => {
      const { bbox } = word;
      const x = bbox.x0 / canvas.width;
      const y = bbox.y0 / canvas.height;
      const w = (bbox.x1 - bbox.x0) / canvas.width;
      const h = (bbox.y1 - bbox.y0) / canvas.height;
      const fontSize = (bbox.y1 - bbox.y0) * (pageHeight / canvas.height); // Estimate font size in page units

      return {
        text: word.text,
        x,
        y,
        width: w,
        height: h,
        fontSize,
      };
    });
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrManager = new OcrManager();
