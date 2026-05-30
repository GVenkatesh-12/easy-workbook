import { create } from 'zustand';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfState {
  /** The raw File object from user upload */
  pdfFile: File | null;
  /** PDF.js document proxy */
  pdfDocument: PDFDocumentProxy | null;
  /** Total page count */
  totalPages: number;
  /** Currently visible/focused page (0-indexed) */
  currentPage: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Page dimensions cache: pageIndex → {width, height} at scale=1 */
  pageDimensions: Map<number, { width: number; height: number }>;
  /** External jump request target */
  jumpTarget: { page: number; id: number } | null;

  // Actions
  setPdfFile: (file: File) => void;
  setPdfDocument: (doc: PDFDocumentProxy) => void;
  setCurrentPage: (page: number) => void;
  jumpToPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPageDimensions: (pageIndex: number, dims: { width: number; height: number }) => void;
  closePdf: () => void;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.25;

export const usePdfStore = create<PdfState>((set) => ({
  pdfFile: null,
  pdfDocument: null,
  totalPages: 0,
  currentPage: 0,
  zoom: 1.0,
  isLoading: false,
  error: null,
  pageDimensions: new Map(),
  jumpTarget: null,

  setPdfFile: (file) => set({ pdfFile: file, error: null }),
  
  setPdfDocument: (doc) => set({ 
    pdfDocument: doc, 
    totalPages: doc.numPages, 
    currentPage: 0,
    isLoading: false,
    error: null,
  }),

  setCurrentPage: (page) => set((state) => ({
    currentPage: Math.max(0, Math.min(page, state.totalPages - 1)),
  })),

  jumpToPage: (page) => set((state) => {
    const validPage = Math.max(0, Math.min(page, state.totalPages - 1));
    return {
      currentPage: validPage,
      jumpTarget: { page: validPage, id: Date.now() }
    };
  }),

  setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
  
  zoomIn: () => set((state) => ({
    zoom: Math.min(MAX_ZOOM, state.zoom + ZOOM_STEP),
  })),
  
  zoomOut: () => set((state) => ({
    zoom: Math.max(MIN_ZOOM, state.zoom - ZOOM_STEP),
  })),
  
  resetZoom: () => set({ zoom: 1.0 }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  setPageDimensions: (pageIndex, dims) => set((state) => {
    const newMap = new Map(state.pageDimensions);
    newMap.set(pageIndex, dims);
    return { pageDimensions: newMap };
  }),

  closePdf: () => set((state) => {
    state.pdfDocument?.destroy();
    return {
      pdfFile: null,
      pdfDocument: null,
      totalPages: 0,
      currentPage: 0,
      zoom: 1.0,
      isLoading: false,
      error: null,
      pageDimensions: new Map(),
      jumpTarget: null,
    };
  }),
}));
