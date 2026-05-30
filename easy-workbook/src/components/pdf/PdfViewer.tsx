import { useRef, useEffect, useState } from 'react';
import { usePdfStore } from '@/store/pdfStore';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { pdfManager } from '@/lib/pdf/pdfManager';
import { PdfPage } from './PdfPage';
import { SelectionOverlay } from '@/components/canvas/SelectionOverlay';

const PAGE_GAP = 16;
const BUFFER_PAGES = 2;

/**
 * Main PDF viewer with virtualized scrolling.
 * Only renders pages that are visible or near the viewport.
 */
export function PdfViewer() {
  const zoom = usePdfStore((s) => s.zoom);
  const totalPages = usePdfStore((s) => s.totalPages);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const jumpTarget = usePdfStore((s) => s.jumpTarget);
  const pageDimensions = usePdfStore((s) => s.pageDimensions);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track container width reactively
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    // Set initial width
    setContainerWidth(el.clientWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Invalidate render cache when zoom changes
  useEffect(() => {
    pdfManager.invalidateAll();
  }, [zoom]);

  // Pinch zoom (uses the scroll container ref)
  usePinchZoom(scrollContainerRef);

  const {
    visibleRange,
    pageInfos,
    totalHeight,
    onScroll,
    scrollRef,
    currentPage,
    scrollToPage,
  } = useVirtualScroll({
    totalPages,
    getPageDimensions: (i) => pageDimensions.get(i),
    containerWidth,
    zoom,
    gap: PAGE_GAP,
    bufferPages: BUFFER_PAGES,
  });

  // Sync the scroll ref from virtual scroll hook to our container ref
  useEffect(() => {
    if (scrollContainerRef.current && scrollRef.current !== scrollContainerRef.current) {
      // They should be the same element via the ref below
    }
  }, [scrollRef]);

  const lastSyncPage = useRef(currentPage);

  // Sync current page to store when scrolling manually
  useEffect(() => {
    if (currentPage !== lastSyncPage.current) {
      lastSyncPage.current = currentPage;
      setCurrentPage(currentPage);
    }
  }, [currentPage, setCurrentPage]);

  const lastProcessedJumpId = useRef<number | null>(null);

  // Jump to page when external request is made
  useEffect(() => {
    if (jumpTarget && jumpTarget.id !== lastProcessedJumpId.current) {
      lastProcessedJumpId.current = jumpTarget.id;
      scrollToPage(jumpTarget.page);
    }
  }, [jumpTarget, scrollToPage]);

  return (
    <div
      ref={(el) => {
        // Share ref between scrollRef (virtual scroll) and scrollContainerRef (pinch zoom)
        (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      onScroll={onScroll}
      className="relative min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-surface-950"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Spacer div to create proper scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {pageInfos.map((info) => {
          const isVisible = info.index >= visibleRange.start && info.index <= visibleRange.end;
          
          if (!isVisible) return null;

          return (
            <div
              key={info.index}
              style={{
                position: 'absolute',
                top: info.top,
                left: Math.max(24, (containerWidth - info.width) / 2),
                width: info.width,
                height: info.height,
              }}
            >
              <PdfPage
                pageIndex={info.index}
                width={info.width}
                height={info.height}
              >
                <SelectionOverlay
                  pageIndex={info.index}
                  width={info.width}
                  height={info.height}
                />
              </PdfPage>
            </div>
          );
        })}
      </div>
    </div>
  );
}
