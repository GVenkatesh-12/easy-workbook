import { usePdfStore } from '@/store/pdfStore';
import { useUiStore } from '@/store/uiStore';
import { useQuestionStore } from '@/store/questionStore';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { IconButton } from '@/components/ui/IconButton';

/**
 * Top toolbar with mode controls, zoom, and actions.
 */
export function Toolbar() {
  const pdfFile = usePdfStore((s) => s.pdfFile);
  const zoom = usePdfStore((s) => s.zoom);
  const zoomIn = usePdfStore((s) => s.zoomIn);
  const zoomOut = usePdfStore((s) => s.zoomOut);
  const resetZoom = usePdfStore((s) => s.resetZoom);
  const currentPage = usePdfStore((s) => s.currentPage);
  const totalPages = usePdfStore((s) => s.totalPages);

  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const openModal = useUiStore((s) => s.openModal);

  const questionCount = useQuestionStore((s) => s.questions.length);
  const { closePdf } = usePdfLoader();

  return (
    <header className="flex items-center h-14 px-3 gap-2 glass border-b border-surface-700/50 z-30 shrink-0">
      {/* Left: Logo + file info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        {pdfFile && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate max-w-[180px]">
              {pdfFile.name}
            </p>
            <p className="text-xs text-surface-500">
              Page {currentPage + 1} / {totalPages}
            </p>
          </div>
        )}
      </div>

      {/* Center: Mode controls + Zoom (only when PDF is loaded) */}
      {pdfFile && (
        <div className="flex-1 flex items-center justify-center gap-1">
          {/* Mode toggle */}
          <div className="flex items-center bg-surface-800 rounded-xl p-0.5 mr-4">
            <IconButton
              size="sm"
              active={mode === 'view'}
              onClick={() => setMode('view')}
              tooltip="View mode"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </IconButton>
            <IconButton
              size="sm"
              active={mode === 'select'}
              onClick={() => setMode('select')}
              tooltip="Select questions"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </IconButton>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <IconButton size="sm" onClick={zoomOut} tooltip="Zoom out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </IconButton>

            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs font-mono text-surface-300 hover:text-surface-100 rounded-lg hover:bg-surface-800 transition-colors min-w-[48px] text-center"
            >
              {Math.round(zoom * 100)}%
            </button>

            <IconButton size="sm" onClick={zoomIn} tooltip="Zoom in">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </IconButton>
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {pdfFile && (
          <>
            {/* Export button */}
            <IconButton
              size="sm"
              onClick={() => openModal('export')}
              tooltip="Export PDF"
              className="relative"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {questionCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {questionCount > 9 ? '9+' : questionCount}
                </span>
              )}
            </IconButton>

            {/* Sidebar toggle */}
            <IconButton
              size="sm"
              active={sidebarOpen}
              onClick={toggleSidebar}
              tooltip="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </IconButton>

            {/* Close PDF */}
            <IconButton size="sm" onClick={closePdf} tooltip="Close PDF">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </>
        )}

        {/* Dark mode toggle */}
        <IconButton size="sm" onClick={toggleDarkMode} tooltip="Toggle theme">
          {darkMode ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </IconButton>
      </div>
    </header>
  );
}
