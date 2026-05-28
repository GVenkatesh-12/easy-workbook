import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * Track which pages have been rendered at which scale,
 * so we can skip redundant renders.
 */
class RenderTracker {
  private rendered = new Map<string, boolean>();

  key(pageIndex: number, scale: number): string {
    return `${pageIndex}-${scale.toFixed(2)}`;
  }

  isRendered(pageIndex: number, scale: number): boolean {
    return this.rendered.get(this.key(pageIndex, scale)) === true;
  }

  markRendered(pageIndex: number, scale: number): void {
    this.rendered.set(this.key(pageIndex, scale), true);
  }

  invalidate(pageIndex: number, scale: number): void {
    this.rendered.delete(this.key(pageIndex, scale));
  }

  clear(): void {
    this.rendered.clear();
  }
}

export class PdfManager {
  private document: PDFDocumentProxy | null = null;
  private renderTracker = new RenderTracker();
  private renderTasks = new Map<number, RenderTask>();
  private pageProxyCache = new Map<number, PDFPageProxy>();

  async loadDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
    // Clean up previous document
    this.destroy();

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.124/cmaps/",
      cMapPacked: true,
      enableXfa: true,
    });

    this.document = await loadingTask.promise;
    return this.document;
  }

  async getPage(pageIndex: number): Promise<PDFPageProxy> {
    if (!this.document) throw new Error("No PDF document loaded");

    // Cache PDFPageProxy objects to avoid repeated getPage calls
    const cached = this.pageProxyCache.get(pageIndex);
    if (cached) return cached;

    // PDF.js uses 1-indexed pages
    const page = await this.document.getPage(pageIndex + 1);
    this.pageProxyCache.set(pageIndex, page);
    return page;
  }

  async getPageDimensions(
    pageIndex: number,
  ): Promise<{ width: number; height: number }> {
    const page = await this.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1 });
    return { width: viewport.width, height: viewport.height };
  }

  /**
   * Render a page directly onto the provided canvas at the given display dimensions.
   * The canvas buffer uses DPR scaling for crisp rendering.
   *
   * @param pageIndex - 0-indexed page number
   * @param canvas - The DOM canvas element to render onto
   * @param displayWidth - CSS pixel width the canvas should display at
   * @param displayHeight - CSS pixel height the canvas should display at
   */
  async renderPageToCanvas(
    pageIndex: number,
    canvas: HTMLCanvasElement,
    displayWidth: number,
    displayHeight: number,
  ): Promise<void> {
    if (!this.document) throw new Error("No PDF document loaded");

    const page = await this.getPage(pageIndex);
    const dpr = window.devicePixelRatio || 1;

    // Calculate the scale needed to fit the page into displayWidth
    const baseViewport = page.getViewport({ scale: 1 });
    const scaleToFit = displayWidth / baseViewport.width;

    // Check if we already rendered this page at this scale
    if (this.renderTracker.isRendered(pageIndex, scaleToFit)) {
      return; // Already rendered, nothing to do
    }

    // Cancel any existing render for this page
    this.cancelRender(pageIndex);

    // Create viewport at display scale * DPR for crisp rendering
    const viewport = page.getViewport({ scale: scaleToFit * dpr });

    // Set canvas buffer size (actual pixels)
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // Set canvas CSS size (display pixels)
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Clear before rendering
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    });

    this.renderTasks.set(pageIndex, renderTask);

    try {
      await renderTask.promise;
      this.renderTracker.markRendered(pageIndex, scaleToFit);
      this.renderTasks.delete(pageIndex);
    } catch (err) {
      this.renderTasks.delete(pageIndex);
      // RenderingCancelledException is expected when scrolling fast
      if ((err as Error).name !== "RenderingCancelledException") {
        throw err;
      }
    }
  }

  /**
   * Render a specific crop region at high resolution for export.
   * Returns a canvas containing only the cropped area.
   */
  async renderCrop(
    pageIndex: number,
    crop: { x: number; y: number; width: number; height: number },
    outputScale = 3,
  ): Promise<HTMLCanvasElement> {
    if (!this.document) throw new Error("No PDF document loaded");

    const page = await this.getPage(pageIndex);
    const viewport = page.getViewport({ scale: outputScale });

    // Create a full-page canvas at high resolution
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;

    const ctx = fullCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    await page.render({ canvas: fullCanvas, canvasContext: ctx, viewport }).promise;

    // Now crop the region
    const cropCanvas = document.createElement("canvas");
    const sx = crop.x * viewport.width;
    const sy = crop.y * viewport.height;
    const sw = crop.width * viewport.width;
    const sh = crop.height * viewport.height;

    cropCanvas.width = Math.floor(sw);
    cropCanvas.height = Math.floor(sh);

    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) throw new Error("Could not get crop canvas context");

    cropCtx.drawImage(
      fullCanvas,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      Math.floor(sw),
      Math.floor(sh),
    );

    return cropCanvas;
  }

  cancelRender(pageIndex: number): void {
    const task = this.renderTasks.get(pageIndex);
    if (task) {
      task.cancel();
      this.renderTasks.delete(pageIndex);
    }
  }

  /**
   * Invalidate the render tracker so pages will re-render.
   * Call this when zoom changes.
   */
  invalidateAll(): void {
    this.renderTracker.clear();
  }

  destroy(): void {
    // Cancel all render tasks
    for (const task of this.renderTasks.values()) {
      task.cancel();
    }
    this.renderTasks.clear();
    this.renderTracker.clear();
    this.pageProxyCache.clear();
    this.document?.destroy();
    this.document = null;
  }

  get numPages(): number {
    return this.document?.numPages ?? 0;
  }

  get isLoaded(): boolean {
    return this.document !== null;
  }
}

/** Singleton PDF manager instance */
export const pdfManager = new PdfManager();
