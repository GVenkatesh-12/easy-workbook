import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { useExportStore } from '@/store/exportStore';
import { useQuestionStore } from '@/store/questionStore';
import { useUiStore } from '@/store/uiStore';
import { generatePdf, downloadPdf } from '@/lib/export/pdfGenerator';
import { generateHtmlPractice, downloadHtml } from '@/lib/export/htmlGenerator';
import { getAllThemes } from '@/lib/export/themes';
import type { ExportType, NoteStyle, ThemeName } from '@/types';
import { getNoteStyleSvg } from '@/lib/export/noteStyleRenderer';

const NOTE_STYLES: { value: NoteStyle; label: string; icon: string }[] = [
  { value: 'blank', label: 'Blank', icon: '⬜' },
  { value: 'lined', label: 'Lined', icon: '📝' },
  { value: 'dotted', label: 'Dotted', icon: '⚬' },
  { value: 'grid', label: 'Grid', icon: '▦' },
];

const EXPORT_TYPES: { value: ExportType; label: string; desc: string }[] = [
  { value: 'practice', label: 'Practice Notebook', desc: 'Questions + blank solving space' },
  { value: 'answer-key', label: 'Answer Key', desc: 'Questions + answers' },
  { value: 'combined', label: 'Combined', desc: 'Questions + solving space + answers' },
];

export function ExportDialog() {
  const modalOpen = useUiStore((s) => s.modalOpen);
  const closeModal = useUiStore((s) => s.closeModal);
  const addToast = useUiStore((s) => s.addToast);
  const questions = useQuestionStore((s) => s.questions);
  const includedQuestions = questions.filter((q) => q.includedInExport);

  const store = useExportStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html'>('pdf');

  const themes = getAllThemes();

  const handleExport = useCallback(async () => {
    if (includedQuestions.length === 0) {
      addToast('No questions selected for export', 'error');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      if (exportFormat === 'pdf') {
        const settings = store.getSettings();
        const bytes = await generatePdf(includedQuestions, settings, setProgress);
        downloadPdf(bytes, `easy-workbook-${Date.now()}.pdf`);
        addToast('PDF exported successfully!', 'success');
      } else {
        const html = await generateHtmlPractice(includedQuestions, setProgress);
        downloadHtml(html, `easy-workbook-practice-${Date.now()}.html`);
        addToast('HTML practice sheet exported!', 'success');
      }
    } catch (err) {
      addToast(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [includedQuestions, store, exportFormat, addToast]);

  const isOpen = modalOpen === 'export';

  return (
    <Modal open={isOpen} onClose={closeModal} title="Export Settings" maxWidth="max-w-3xl">
      <div className="p-6 space-y-8">
        {/* Format Selector */}
        <div>
          <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 block">
            Export Format
          </label>
          <div className="flex gap-2">
            {(['pdf', 'html'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200
                  ${exportFormat === fmt
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                    : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
                  }`}
              >
                {fmt === 'pdf' ? '📄 PDF Document' : '🌐 HTML Practice'}
              </button>
            ))}
          </div>
        </div>

        {/* PDF-specific options */}
        {exportFormat === 'pdf' && (
          <>
            {/* Export Type */}
            <div>
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 block">
                Export Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EXPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => store.setExportType(type.value)}
                    className={`p-3 rounded-xl text-left transition-all duration-200
                      ${store.exportType === type.value
                        ? 'bg-brand-500/20 border border-brand-500/40'
                        : 'bg-surface-800 border border-surface-700 hover:border-surface-600'
                      }`}
                  >
                    <div className="text-sm font-medium text-surface-200">{type.label}</div>
                    <div className="text-xs text-surface-500 mt-1">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions per page */}
            <div>
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 block">
                Questions per Page
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => store.setQuestionsPerPage(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                      ${store.questionsPerPage === n
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                        : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Style */}
            <div>
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 block">
                Note Style
              </label>
              <div className="grid grid-cols-4 gap-2">
                {NOTE_STYLES.map((style) => {
                  const svg = getNoteStyleSvg(style.value, { lineColor: '#6366f1', opacity: 0.4 });
                  const bgImage = svg
                    ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
                    : 'none';

                  return (
                    <button
                      key={style.value}
                      onClick={() => store.setNoteStyle(style.value)}
                      className={`relative p-4 rounded-xl text-center transition-all duration-200 overflow-hidden
                        ${store.noteStyle === style.value
                          ? 'border-2 border-brand-500 bg-brand-500/10'
                          : 'border border-surface-700 bg-surface-800 hover:border-surface-600'
                        }`}
                    >
                      {/* Pattern preview */}
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{ backgroundImage: bgImage }}
                      />
                      <div className="relative">
                        <div className="text-xl mb-1">{style.icon}</div>
                        <div className="text-xs font-medium text-surface-300">{style.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Note style controls */}
              {store.noteStyle !== 'blank' && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-surface-500 mb-1.5 block">Opacity</label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={store.noteStyleOpacity}
                      onChange={(e) => store.setNoteStyleOpacity(parseFloat(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-500 mb-1.5 block">Spacing</label>
                    <input
                      type="range"
                      min="12"
                      max="40"
                      step="2"
                      value={store.lineSpacing}
                      onChange={(e) => store.setLineSpacing(parseInt(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 block">
                Color Theme
              </label>
              <div className="grid grid-cols-5 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => store.setTheme(theme.name as ThemeName)}
                    className={`p-3 rounded-xl text-center transition-all duration-200
                      ${store.theme === theme.name
                        ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-900'
                        : 'hover:scale-105'
                      }`}
                  >
                    {/* Color preview dots */}
                    <div className="flex justify-center gap-1 mb-2">
                      <div className="w-4 h-4 rounded-full border border-surface-600" style={{ background: theme.background }} />
                      <div className="w-4 h-4 rounded-full border border-surface-600" style={{ background: theme.accent }} />
                      <div className="w-4 h-4 rounded-full border border-surface-600" style={{ background: theme.lineColor }} />
                    </div>
                    <div className="text-xs font-medium text-surface-300">{theme.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Include Answers */}
            <div className="flex items-center justify-between p-4 bg-surface-800 rounded-xl border border-surface-700">
              <div>
                <div className="text-sm font-medium text-surface-200">Include Answers</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  Show answer regions in the exported PDF
                </div>
              </div>
              <Toggle
                checked={store.includeAnswers}
                onChange={store.setIncludeAnswers}
              />
            </div>
          </>
        )}

        {/* Summary + Export button */}
        <div className="pt-4 border-t border-surface-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-surface-400">
              {includedQuestions.length} question{includedQuestions.length !== 1 ? 's' : ''} will be exported
            </span>
            {isExporting && (
              <span className="text-xs text-brand-400 font-mono">
                {Math.round(progress)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isExporting && (
            <div className="w-full h-1.5 bg-surface-800 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              loading={isExporting}
              disabled={includedQuestions.length === 0}
              className="flex-[2]"
            >
              {isExporting
                ? 'Generating...'
                : `Export ${exportFormat.toUpperCase()}`
              }
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
