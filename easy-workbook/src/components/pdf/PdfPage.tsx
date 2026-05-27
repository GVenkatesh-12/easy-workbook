import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { pdfManager } from '@/lib/pdf/pdfManager';
import { usePdfStore } from '@/store/pdfStore';

interface PdfPageProps {
  pageIndex: number;
  width: number;
  height: number;
  children?: React.ReactNode; // For selection overlay
}

/**
 * Individual PDF page renderer.
 * Renders the page directly onto a canvas at the given display dimensions.
 */
export const PdfPage = memo(function PdfPage({ pageIndex, width, height, children }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const renderIdRef = useRef(0);
  const setPageDimensions = usePdfStore((s) => s.setPageDimensions);

  const renderPage = useCallback(async () => {
    const renderId = ++renderIdRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !pdfManager.isLoaded) return;

    // Don't re-render if width/height haven't actually changed
    setIsRendering(true);
    try {
      await pdfManager.renderPageToCanvas(pageIndex, canvas, width, height);
      // Only update state if this is still the latest render request
      if (renderId === renderIdRef.current) {
        setIsRendered(true);
      }
    } catch (err) {
      // Log non-cancellation errors for debugging
      if (err instanceof Error && err.name !== 'RenderingCancelledException') {
        console.error(`Failed to render page ${pageIndex}:`, err);
      }
    } finally {
      if (renderId === renderIdRef.current) {
        setIsRendering(false);
      }
    }
  }, [pageIndex, width, height]);

  // Trigger render when page index or display size changes
  useEffect(() => {
    // Invalidate since dimensions changed
    pdfManager.invalidateAll();
    setIsRendered(false);
    renderPage();
    return () => {
      // Bump render ID to ignore stale renders
      renderIdRef.current++;
      pdfManager.cancelRender(pageIndex);
    };
  }, [renderPage, pageIndex]);

  // Cache page dimensions on mount
  useEffect(() => {
    pdfManager.getPageDimensions(pageIndex).then((dims) => {
      setPageDimensions(pageIndex, dims);
    }).catch(() => {
      // Non-critical
    });
  }, [pageIndex, setPageDimensions]);

  return (
    <div
      data-page-index={pageIndex}
      className="relative mx-auto bg-white shadow-2xl shadow-black/30 rounded-sm overflow-hidden"
      style={{ width, height }}
    >
      {/* Loading skeleton */}
      {!isRendered && (
        <div className="absolute inset-0 skeleton flex items-center justify-center">
          <span className="text-surface-500 text-sm font-medium">
            Page {pageIndex + 1}
          </span>
        </div>
      )}

      {/* Rendering indicator */}
      {isRendering && isRendered && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-400 animate-pulse z-20" />
      )}

      {/* PDF Canvas */}
      <canvas
        ref={canvasRef}
        className={`block transition-opacity duration-200 ${isRendered ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Selection overlay (Konva stage goes here) */}
      {children}

      {/* Page number badge */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-xs font-mono z-20">
        {pageIndex + 1}
      </div>
    </div>
  );
});
