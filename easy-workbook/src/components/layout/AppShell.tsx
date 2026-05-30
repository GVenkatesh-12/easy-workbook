import { usePdfStore } from '@/store/pdfStore';
import { useUiStore } from '@/store/uiStore';
import { Toolbar } from './Toolbar';
import { WelcomeScreen } from './WelcomeScreen';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { QuestionSidebar } from '@/components/sidebar/QuestionSidebar';
import { ExportDialog } from '@/components/export/ExportDialog';
import { ToastContainer } from '@/components/ui/Toast';
import { ProductTour } from '@/components/tour/ProductTour';

/**
 * Main application shell — orchestrates the layout.
 */
export function AppShell() {
  const pdfDocument = usePdfStore((s) => s.pdfDocument);
  const isLoading = usePdfStore((s) => s.isLoading);
  const mode = useUiStore((s) => s.mode);

  const hasPdf = pdfDocument !== null;

  return (
    <div className="h-dvh min-h-dvh w-full overflow-hidden flex flex-col bg-surface-950 bg-dot-grid">
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-950/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-5">
              <div className="w-14 h-14 border-[3px] border-surface-600 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-surface-400 font-medium">Loading PDF…</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!hasPdf ? (
          <WelcomeScreen />
        ) : (
          <>
            {/* Mode indicator banner */}
            {(mode === 'select' || mode === 'answer-select') && (
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center py-3 pointer-events-none">
                <div className={`
                  glass rounded-full px-5 py-2.5 flex items-center gap-3 text-xs font-semibold pointer-events-auto shadow-lg
                  ${mode === 'answer-select'
                    ? 'text-emerald-400 border border-emerald-500/30'
                    : 'text-brand-400 border border-brand-500/30'
                  }
                `}>
                  <span className={`w-2 h-2 rounded-full animate-pulse ${
                    mode === 'answer-select' ? 'bg-emerald-400' : 'bg-brand-400'
                  }`} />
                  {mode === 'answer-select'
                    ? 'Answer Mode — Draw the answer/explanation region'
                    : 'Selection Mode — Draw to crop a question region'
                  }
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

      {/* Product Tour */}
      <ProductTour />
    </div>
  );
}
