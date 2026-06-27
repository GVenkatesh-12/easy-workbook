import { useCallback } from 'react';
import { pdfManager } from '@/lib/pdf/pdfManager';
import { usePdfStore } from '@/store/pdfStore';
import { useUiStore } from '@/store/uiStore';
import { useQuestionStore } from '@/store/questionStore';
import { useDetectionStore } from '@/store/detectionStore';

/**
 * Hook to handle PDF file loading.
 */
export function usePdfLoader() {
  const {
    setPdfFile,
    setPdfDocument,
    setLoading,
    setError,
    setPageDimensions,
  } = usePdfStore();
  const addToast = useUiStore((s) => s.addToast);

  const resetPdfSession = useCallback(() => {
    useDetectionStore.getState().clearDetection();
    useQuestionStore.getState().clearAll();
    useUiStore.getState().setDetectionMode('off');
    useUiStore.getState().setMode('view');
  }, []);

  const loadPdf = useCallback(async (file: File) => {
    try {
      usePdfStore.getState().closePdf();
      resetPdfSession();
      setLoading(true);
      setPdfFile(file);
      
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfManager.loadDocument(arrayBuffer);
      
      setPdfDocument(doc);

      // Pre-cache first few page dimensions
      const pagesToCache = Math.min(doc.numPages, 5);
      for (let i = 0; i < pagesToCache; i++) {
        const dims = await pdfManager.getPageDimensions(i);
        setPageDimensions(i, dims);
      }

      addToast(`Loaded "${file.name}" (${doc.numPages} pages)`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load PDF';
      setError(message);
      addToast(message, 'error');
    }
  }, [setPdfFile, setPdfDocument, setLoading, setError, setPageDimensions, addToast, resetPdfSession]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      loadPdf(file);
    } else {
      addToast('Please drop a valid PDF file', 'error');
    }
  }, [loadPdf, addToast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadPdf(file);
    }
  }, [loadPdf]);

  const closePdf = useCallback(() => {
    const questions = useQuestionStore.getState().questions;
    if (questions.length > 0) {
      const confirmClose = window.confirm(
        `You have ${questions.length} cropped question(s). Closing the PDF will discard all selections. Are you sure you want to continue?`
      );
      if (!confirmClose) return;
    }
    pdfManager.destroy();
    usePdfStore.getState().closePdf();
    resetPdfSession();
    addToast('PDF closed', 'info');
  }, [addToast, resetPdfSession]);

  return { loadPdf, handleFileDrop, handleFileSelect, closePdf };
}
