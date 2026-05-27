import { usePdfStore } from '@/store/pdfStore';
import { useUiStore } from '@/store/uiStore';
import { Toolbar } from './Toolbar';
import { WelcomeScreen } from './WelcomeScreen';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { QuestionSidebar } from '@/components/sidebar/QuestionSidebar';
import { ExportDialog } from '@/components/export/ExportDialog';
import { ToastContainer } from '@/components/ui/Toast';

/**
 * Main application shell — orchestrates the layout.
 */
export function AppShell() {
  const pdfDocument = usePdfStore((s) => s.pdfDocument);
  const isLoading = usePdfStore((s) => s.isLoading);
  const mode = useUiStore((s) => s.mode);

  const hasPdf = pdfDocument !== null;

  return (
    <div className="h-full flex flex-col bg-surface-950">
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-950/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-3 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-surface-400">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!hasPdf ? (
          <WelcomeScreen />
        ) : (
          <>
            {/* Mode indicator bar */}
            {mode === 'select' && (
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center py-2 pointer-events-none">
                <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-medium text-brand-400 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                  Selection Mode — Drag to select question regions
                </div>
              </div>
            )}

            {/* PDF Viewer */}
            <PdfViewer />

            {/* Sidebar */}
            <QuestionSidebar />
          </>
        )}
      </div>

      {/* Modals */}
      <ExportDialog />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}
