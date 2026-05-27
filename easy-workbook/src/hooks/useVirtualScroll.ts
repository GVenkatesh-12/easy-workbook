import { useState, useCallback, useRef, useEffect } from 'react';
import type { PageInfo } from '@/types';

interface VirtualScrollOptions {
  totalPages: number;
  getPageDimensions: (index: number) => { width: number; height: number } | undefined;
  containerWidth: number;
  zoom: number;
  gap: number;
  bufferPages: number;
}

interface VirtualScrollResult {
  visibleRange: { start: number; end: number };
  pageInfos: PageInfo[];
  totalHeight: number;
  scrollToPage: (pageIndex: number) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  currentPage: number;
}

/**
 * Custom virtualization hook for the PDF viewer.
 * Only renders pages in/near the viewport.
 */
export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollResult {
  const { totalPages, getPageDimensions, containerWidth, zoom, gap, bufferPages } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  // Calculate page infos with cumulative offsets
  const pageInfos: PageInfo[] = [];
  let cumTop = gap;
  const defaultDims = { width: 595, height: 842 }; // A4 default

  for (let i = 0; i < totalPages; i++) {
    const dims = getPageDimensions(i) || defaultDims;
    const scaledWidth = dims.width * zoom;
    const scaledHeight = dims.height * zoom;
    // Center the page if narrower than container
    const displayWidth = Math.min(scaledWidth, containerWidth - 40);
    const scale = displayWidth / dims.width;
    const displayHeight = dims.height * scale;

    pageInfos.push({
      index: i,
      width: displayWidth,
      height: displayHeight,
      top: cumTop,
    });
    cumTop += displayHeight + gap;
  }
  const totalHeight = cumTop;

  // Determine visible range
  const viewTop = scrollTop;
  const viewBottom = scrollTop + containerHeight;

  let start = 0;
  let end = 0;

  for (let i = 0; i < pageInfos.length; i++) {
    const info = pageInfos[i];
    const pageBottom = info.top + info.height;
    if (pageBottom >= viewTop) {
      start = i;
      break;
    }
  }

  for (let i = start; i < pageInfos.length; i++) {
    end = i;
    if (pageInfos[i].top > viewBottom) break;
  }

  // Apply buffer
  const bufferedStart = Math.max(0, start - bufferPages);
  const bufferedEnd = Math.min(totalPages - 1, end + bufferPages);

  // Current page (page most visible)
  let currentPage = start;
  let maxVisible = 0;
  for (let i = start; i <= end && i < pageInfos.length; i++) {
    const info = pageInfos[i];
    const visibleTop = Math.max(info.top, viewTop);
    const visibleBottom = Math.min(info.top + info.height, viewBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    if (visibleHeight > maxVisible) {
      maxVisible = visibleHeight;
      currentPage = i;
    }
  }

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToPage = useCallback((pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < pageInfos.length && scrollRef.current) {
      const info = pageInfos[pageIndex];
      scrollRef.current.scrollTo({ top: info.top - gap, behavior: 'smooth' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageInfos, gap]);

  // Track container height
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return {
    visibleRange: { start: bufferedStart, end: bufferedEnd },
    pageInfos,
    totalHeight,
    scrollToPage,
    onScroll,
    scrollRef,
    currentPage,
  };
}
