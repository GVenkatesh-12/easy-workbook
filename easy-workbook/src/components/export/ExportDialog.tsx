import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useExportStore } from '@/store/exportStore';
import { useQuestionStore } from '@/store/questionStore';
import { useUiStore } from '@/store/uiStore';
import { generatePdf, downloadPdf } from '@/lib/export/pdfGenerator';
import { generateHtmlPractice, downloadHtml } from '@/lib/export/htmlGenerator';
import { getAllThemes } from '@/lib/export/themes';
import { getNoteStyleSvg } from '@/lib/export/noteStyleRenderer';
import { ExportPreview } from './ExportPreview';
import type { NoteStyle, ExportType, ThemeName } from '@/types';

import {
  Square,
  AlignJustify,
  Circle,
  Grid3x3,
  Settings,
  Palette,
  CheckCircle,
  FileText,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BookOpen,
  FileSliders
} from 'lucide-react';

const NOTE_STYLES: { value: NoteStyle; label: string; icon: React.ReactNode }[] = [
  { value: 'blank', label: 'Blank', icon: <Square className="w-6 h-6 mx-auto" strokeWidth={1.5} /> },
  { value: 'lined', label: 'Lined', icon: <AlignJustify className="w-6 h-6 mx-auto" strokeWidth={1.5} /> },
  { value: 'dotted', label: 'Dotted', icon: <Circle className="w-6 h-6 mx-auto" strokeWidth={1.5} /> },
  { value: 'grid', label: 'Grid', icon: <Grid3x3 className="w-6 h-6 mx-auto" strokeWidth={1.5} /> },
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
  const [activeTab, setActiveTab] = useState<'general' | 'cover' | 'headers' | 'appearance' | 'answers'>('general');

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
        const settings = store.getSettings();
        const html = await generateHtmlPractice(includedQuestions, settings, setProgress);
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
    <Modal open={isOpen} onClose={closeModal} title="Export Settings" maxWidth="max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 p-4 sm:p-5">
        
        {/* Left Column: Settings */}
        <div className="flex flex-col max-h-[75vh]">
          {/* Tabs */}
          {exportFormat === 'pdf' && (
            <div className="flex gap-1 border border-surface-700 p-1 mb-5 shrink-0 bg-surface-800/30 rounded-lg overflow-x-auto scrollbar-none">
              {([
                { id: 'general', label: 'General', icon: <Settings className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'cover', label: 'Cover Page', icon: <BookOpen className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'headers', label: 'Headers', icon: <FileSliders className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'appearance', label: 'Appearance', icon: <Palette className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'answers', label: 'Answers', icon: <CheckCircle className="w-3.5 h-3.5 shrink-0" /> },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 px-3 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-colors z-10 flex items-center justify-center gap-1.5 min-w-[90px] ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="exportTabPill"
                      className="absolute inset-0 bg-brand-500 rounded-md -z-10 shadow-md shadow-brand-500/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Settings Content Area */}
          <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-5 custom-scrollbar">
            
            {/* -------------------- GENERAL TAB -------------------- */}
            {(activeTab === 'general' || exportFormat !== 'pdf') && (
              <div className="space-y-5">
                {/* Format Selector */}
                <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                  <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                    Export Format
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(['pdf', 'html'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200
                          ${exportFormat === fmt
                            ? 'bg-brand-500/20 text-brand-400 border-2 border-brand-500/50 shadow-lg shadow-brand-500/10'
                            : 'bg-surface-900 text-surface-400 border-2 border-surface-700 hover:border-surface-600'
                          }`}
                      >
                        {fmt === 'pdf' ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4 shrink-0" /> PDF Document
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Globe className="w-4 h-4 shrink-0" /> HTML Practice
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {exportFormat === 'pdf' && (
                  <>
                    {/* Export Type */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                        Export Type
                      </label>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        {EXPORT_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => store.setExportType(type.value)}
                            className={`p-3 rounded-lg text-left transition-all duration-200
                              ${store.exportType === type.value
                                ? 'bg-brand-500/20 border-2 border-brand-500/50 shadow-lg shadow-brand-500/10'
                                : 'bg-surface-900 border-2 border-surface-700 hover:border-surface-600'
                              }`}
                          >
                            <div className={`text-sm font-bold ${store.exportType === type.value ? 'text-brand-400' : 'text-surface-200'}`}>{type.label}</div>
                            <div className="text-[11px] text-surface-500 mt-1 leading-relaxed">{type.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Document Details */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                        Document Details
                      </label>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* PDF Title */}
                        <div>
                          <label className="text-xs text-surface-500 mb-1.5 block">PDF Title</label>
                          <input
                            type="text"
                            value={store.pdfTitle}
                            onChange={(e) => store.setPdfTitle(e.target.value)}
                            placeholder="Easy Workbook"
                            className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>

                        {/* Questions per page */}
                        <div>
                          <label className="text-xs text-surface-500 mb-1.5 block">
                            Questions per Page
                          </label>
                          <div className="flex gap-2">
                            {([1, 2, 3] as const).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => store.setQuestionsPerPage(n)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200
                                  ${store.questionsPerPage === n
                                    ? 'bg-brand-500/20 text-brand-400 border-2 border-brand-500/50'
                                    : 'bg-surface-900 text-surface-400 border-2 border-surface-700 hover:border-surface-600'
                                  }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Margins Presets */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                        Page Margins
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { name: 'Narrow', value: { top: 20, right: 20, bottom: 20, left: 20 } },
                          { name: 'Normal', value: { top: 40, right: 40, bottom: 40, left: 40 } },
                          { name: 'Wide', value: { top: 60, right: 60, bottom: 60, left: 60 } }
                        ] as const).map((preset) => {
                          const isActive = store.margins.top === preset.value.top;
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => store.setMargins(preset.value)}
                              className={`py-2 rounded-lg text-xs font-bold transition-all duration-200
                                ${isActive
                                  ? 'bg-brand-500/20 text-brand-400 border-2 border-brand-500/50'
                                  : 'bg-surface-900 text-surface-400 border-2 border-surface-700 hover:border-surface-600'
                                }`}
                            >
                              {preset.name} ({preset.value.top}pt)
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Typography Setting */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                        Document Typography
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id: 'helvetica', name: 'Sans-Serif', desc: 'Helvetica' },
                          { id: 'times', name: 'Serif', desc: 'Times New Roman' },
                          { id: 'courier', name: 'Monospace', desc: 'Courier' }
                        ] as const).map((fontItem) => {
                          const isActive = store.fontFamily === fontItem.id;
                          return (
                            <button
                              key={fontItem.id}
                              type="button"
                              onClick={() => store.setFontFamily(fontItem.id)}
                              className={`py-2 px-3 rounded-lg text-center transition-all duration-200 flex flex-col items-center justify-center
                                ${isActive
                                  ? 'bg-brand-500/20 border-2 border-brand-500/50'
                                  : 'bg-surface-900 border-2 border-surface-700 hover:border-surface-600'
                                }`}
                            >
                              <span className={`text-xs font-bold ${isActive ? 'text-brand-400' : 'text-surface-200'}`}>
                                {fontItem.name}
                              </span>
                              <span className="text-[9px] text-surface-500 mt-0.5">{fontItem.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Question Image Scale */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                      <div className="flex items-center justify-between mb-3.5">
                        <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                          Question Image Size
                        </label>
                        <span className="text-xs text-brand-400 font-mono font-bold px-2 py-0.5 bg-brand-500/10 rounded">
                          {Math.round(store.questionImageScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={store.questionImageScale}
                        onChange={(e) => store.setQuestionImageScale(parseFloat(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                      <p className="text-[11px] text-surface-500 mt-2">
                        Scale down the question image to make more room for solving space.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* -------------------- COVER PAGE TAB -------------------- */}
            {activeTab === 'cover' && exportFormat === 'pdf' && (
              <div className="space-y-5">
                {/* Include Cover Page Toggle */}
                <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block mb-1">
                      Include Cover Page
                    </label>
                    <p className="text-[11px] text-surface-500">
                      Generate a beautiful front cover page for your workbook.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => store.setIncludeCoverPage(!store.includeCoverPage)}
                    className={`relative w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 ease-in-out shrink-0 outline-none ring-2 ring-transparent focus-visible:ring-brand-500 ${
                      store.includeCoverPage 
                        ? 'bg-brand-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]' 
                        : 'bg-surface-700 border border-surface-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm border border-black/10 ${
                        store.includeCoverPage ? 'translate-x-5 shadow-[0_2px_5px_rgba(0,0,0,0.3)] scale-110' : 'translate-x-0 opacity-80'
                      }`}
                    />
                  </button>
                </div>

                {store.includeCoverPage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Cover Page Styles */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                        Cover Page Theme
                      </label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {([
                          { id: 'minimal', label: 'Minimalist', desc: 'Clean borderless layout' },
                          { id: 'modern', label: 'Modern Accent', desc: 'Solid shape geometries' },
                          { id: 'classic', label: 'Classic Frame', desc: 'Formal line borders' },
                          { id: 'geometric', label: 'Geometric Grid', desc: 'Creative layered angles' }
                        ] as const).map((ct) => (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => store.setCoverPageTheme(ct.id)}
                            className={`p-3 rounded-lg text-center transition-all duration-200 flex flex-col justify-between h-full min-h-[90px]
                              ${store.coverPageTheme === ct.id
                                ? 'bg-brand-500/20 border-2 border-brand-500/50 shadow-lg shadow-brand-500/10'
                                : 'bg-surface-900 border-2 border-surface-700 hover:border-surface-600'
                              }`}
                          >
                            <div className={`text-xs font-bold ${store.coverPageTheme === ct.id ? 'text-brand-400' : 'text-surface-200'}`}>
                              {ct.label}
                            </div>
                            <div className="text-[9px] text-surface-500 mt-1 leading-relaxed">{ct.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Metadata fields */}
                    <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 space-y-4">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                        Cover Page Details
                      </label>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Title */}
                        <div>
                          <label className="text-xs text-surface-500 mb-1.5 block">Cover Page Title</label>
                          <input
                            type="text"
                            value={store.coverPageTitle}
                            onChange={(e) => store.setCoverPageTitle(e.target.value)}
                            placeholder={store.pdfTitle || "Workbook Title"}
                            className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>

                        {/* Subtitle */}
                        <div>
                          <label className="text-xs text-surface-500 mb-1.5 block">Cover Page Subtitle</label>
                          <input
                            type="text"
                            value={store.coverPageSubtitle}
                            onChange={(e) => store.setCoverPageSubtitle(e.target.value)}
                            placeholder="Practice Question Set"
                            className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="text-xs text-surface-500 mb-1.5 block">Subject / Category</label>
                          <input
                            type="text"
                            value={store.coverPageSubject}
                            onChange={(e) => store.setCoverPageSubject(e.target.value)}
                            placeholder="e.g. Mathematics"
                            className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>

                        {/* Author */}
                        <div>
                          <label className="text-xs text-surface-500 mb-1.5 block">Author / Institution</label>
                          <input
                            type="text"
                            value={store.coverPageAuthor}
                            onChange={(e) => store.setCoverPageAuthor(e.target.value)}
                            placeholder="e.g. Professor Smith"
                            className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* -------------------- HEADERS TAB -------------------- */}
            {activeTab === 'headers' && exportFormat === 'pdf' && (
              <div className="space-y-5">
                {/* Headers Layout Customization */}
                <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 space-y-4">
                  <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                    Header Setup
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Header Left Text */}
                    <div>
                      <label className="text-xs text-surface-500 mb-1.5 block">Header Left Text</label>
                      <input
                        type="text"
                        value={store.headerLeft}
                        onChange={(e) => store.setHeaderLeft(e.target.value)}
                        placeholder={store.pdfTitle || "Easy Workbook"}
                        className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    {/* Header Right Content Selection */}
                    <div>
                      <label className="text-xs text-surface-500 mb-1.5 block">Header Right Content</label>
                      <select
                        value={store.headerRight}
                        onChange={(e) => store.setHeaderRight(e.target.value as any)}
                        className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="page">Page Numbers (Page X / Y)</option>
                        <option value="date">Current Date</option>
                        <option value="none">Empty / Hidden</option>
                        <option value="custom">Custom Text</option>
                      </select>
                    </div>

                    {store.headerRight === 'custom' && (
                      <div className="sm:col-span-2">
                        <label className="text-xs text-surface-500 mb-1.5 block">Custom Header Right Text</label>
                        <input
                          type="text"
                          value={store.headerRightCustom}
                          onChange={(e) => store.setHeaderRightCustom(e.target.value)}
                          placeholder="e.g. Unit 3 Test"
                          className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Header Line Toggle */}
                  <div className="flex items-center justify-between pt-4 border-t border-surface-700">
                    <div>
                      <label className="text-xs text-surface-200 font-semibold block mb-0.5">Show Header Separation Line</label>
                      <p className="text-[10px] text-surface-500">Draws a thin horizontal line separating headers from content.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.setShowHeaderLine(!store.showHeaderLine)}
                      className={`relative w-10 h-5.5 rounded-full flex items-center p-0.5 transition-all duration-300 ease-in-out shrink-0 outline-none ${
                        store.showHeaderLine 
                          ? 'bg-brand-500' 
                          : 'bg-surface-700 border border-surface-600'
                      }`}
                    >
                      <span
                        className={`block w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm ${
                          store.showHeaderLine ? 'translate-x-4.5 scale-110' : 'translate-x-0 opacity-80'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Footers Layout Customization */}
                <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 space-y-4">
                  <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                    Footer Setup
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Footer Left Text */}
                    <div>
                      <label className="text-xs text-surface-500 mb-1.5 block">Footer Left Text</label>
                      <input
                        type="text"
                        value={store.footerLeft}
                        onChange={(e) => store.setFooterLeft(e.target.value)}
                        placeholder="e.g. Copyright © 2026"
                        className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    {/* Footer Right Content Selection */}
                    <div>
                      <label className="text-xs text-surface-500 mb-1.5 block">Footer Right Content</label>
                      <select
                        value={store.footerRight}
                        onChange={(e) => store.setFooterRight(e.target.value as any)}
                        className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="none">Empty / Hidden</option>
                        <option value="page">Page Numbers (Page X / Y)</option>
                        <option value="date">Current Date</option>
                        <option value="custom">Custom Text</option>
                      </select>
                    </div>

                    {store.footerRight === 'custom' && (
                      <div className="sm:col-span-2">
                        <label className="text-xs text-surface-500 mb-1.5 block">Custom Footer Right Text</label>
                        <input
                          type="text"
                          value={store.footerRightCustom}
                          onChange={(e) => store.setFooterRightCustom(e.target.value)}
                          placeholder="e.g. Page number placeholder"
                          className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Footer Line Toggle */}
                  <div className="flex items-center justify-between pt-4 border-t border-surface-700">
                    <div>
                      <label className="text-xs text-surface-200 font-semibold block mb-0.5">Show Footer Separation Line</label>
                      <p className="text-[10px] text-surface-500">Draws a thin horizontal line separating footers from content.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.setShowFooterLine(!store.showFooterLine)}
                      className={`relative w-10 h-5.5 rounded-full flex items-center p-0.5 transition-all duration-300 ease-in-out shrink-0 outline-none ${
                        store.showFooterLine 
                          ? 'bg-brand-500' 
                          : 'bg-surface-700 border border-surface-600'
                      }`}
                    >
                      <span
                        className={`block w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm ${
                          store.showFooterLine ? 'translate-x-4.5 scale-110' : 'translate-x-0 opacity-80'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- APPEARANCE TAB -------------------- */}
            {activeTab === 'appearance' && exportFormat === 'pdf' && (
              <div className="space-y-5">
                {/* Theme */}
                <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                  <div className="flex items-center justify-between mb-3.5">
                    <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                      Color Theme
                    </label>
                    {store.customPageColor && (
                      <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        Background overridden by Custom Color
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {themes.map((theme) => (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() => store.setTheme(theme.name as ThemeName)}
                        className={`p-3 rounded-lg text-center transition-all duration-200
                          ${store.theme === theme.name
                            ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-900 bg-surface-900 shadow-xl'
                            : 'bg-surface-900 border-2 border-transparent hover:border-surface-700'
                          }`}
                      >
                        {/* Color preview dots */}
                        <div className="flex justify-center gap-1 mb-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-surface-600 shadow-sm" style={{ background: theme.background }} />
                          <div className="w-3.5 h-3.5 rounded-full border border-surface-600 shadow-sm" style={{ background: theme.accent }} />
                          <div className="w-3.5 h-3.5 rounded-full border border-surface-600 shadow-sm" style={{ background: theme.lineColor }} />
                        </div>
                        <div className="text-[11px] font-bold text-surface-300">{theme.label}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Page Color */}
                  <div className="mt-4 pt-4 border-t border-surface-700">
                    <label className="text-xs text-surface-500 mb-2 block">Custom Page Background (Optional)</label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden border-2 border-surface-600 hover:border-brand-500 transition-colors cursor-pointer shadow-sm">
                        <input
                          type="color"
                          value={store.customPageColor || '#ffffff'}
                          onChange={(e) => store.setCustomPageColor(e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-0"
                          title="Choose custom background color"
                        />
                        <div
                          className="w-full h-full pointer-events-none"
                          style={{
                            backgroundColor: store.customPageColor || 'transparent',
                            backgroundImage: store.customPageColor ? 'none' : 'repeating-linear-gradient(45deg, #27272a 25%, transparent 25%, transparent 75%, #27272a 75%, #27272a), repeating-linear-gradient(45deg, #27272a 25%, #18181b 25%, #18181b 75%, #27272a 75%, #27272a)',
                            backgroundPosition: '0 0, 4px 4px',
                            backgroundSize: '8px 8px'
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-surface-200">
                          {store.customPageColor ? store.customPageColor.toUpperCase() : 'Default Theme Color'}
                        </span>
                        {store.customPageColor && (
                          <button
                            type="button"
                            onClick={() => store.setCustomPageColor('')}
                            className="text-[11px] text-surface-400 hover:text-red-400 text-left transition-colors mt-0.5"
                          >
                            Reset to Theme Color
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Watermark Section */}
                  <div className="mt-4 pt-4 border-t border-surface-700 space-y-4">
                    <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                      Custom Watermark
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-surface-500 mb-1.5 block">Watermark Text</label>
                        <input
                          type="text"
                          value={store.watermarkText}
                          onChange={(e) => store.setWatermarkText(e.target.value)}
                          placeholder="e.g. DRAFT / CONFIDENTIAL"
                          className="w-full bg-surface-900 border-2 border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs text-surface-500 block">Watermark Opacity</label>
                          <span className="text-[10px] text-brand-400 font-bold">{Math.round(store.watermarkOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.4"
                          step="0.05"
                          value={store.watermarkOpacity}
                          onChange={(e) => store.setWatermarkOpacity(parseFloat(e.target.value))}
                          className="w-full accent-brand-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invert Crop Colors */}
                  <div className="mt-4 pt-4 border-t border-surface-700 flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block mb-1">
                        Invert Crop Colors
                      </label>
                      <p className="text-[11px] text-surface-500">
                        Invert the colors of cropped images (great for dark mode themes).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.setInvertCropColors(!store.invertCropColors)}
                      className={`relative w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 ease-in-out shrink-0 outline-none ring-2 ring-transparent focus-visible:ring-brand-500 ${
                        store.invertCropColors 
                          ? 'bg-brand-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]' 
                          : 'bg-surface-700 border border-surface-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm border border-black/10 ${
                          store.invertCropColors ? 'translate-x-5 shadow-[0_2px_5px_rgba(0,0,0,0.3)] scale-110' : 'translate-x-0 opacity-80'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Remove Background (Beta) */}
                  <div className="mt-4 pt-4 border-t border-surface-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                          Remove Background
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          BETA
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-500 max-w-sm">
                        Use AI to make crop backgrounds transparent. 
                        <span className="text-amber-400/80 ml-1 block mt-1">
                          ⚠️ Runs a heavy in-browser AI model. First export may take ~30s to download the model.
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.setRemoveBackground(!store.removeBackground)}
                      className={`relative w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 ease-in-out shrink-0 outline-none ring-2 ring-transparent focus-visible:ring-amber-500 ${
                        store.removeBackground 
                          ? 'bg-amber-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]' 
                          : 'bg-surface-700 border border-surface-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm border border-black/10 ${
                          store.removeBackground ? 'translate-x-5 shadow-[0_2px_5px_rgba(0,0,0,0.3)] scale-110' : 'translate-x-0 opacity-80'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Note Style */}
                <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                  <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                    Page Pattern
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {NOTE_STYLES.map((style) => {
                      const svg = getNoteStyleSvg(style.value, { lineColor: '#6366f1', opacity: 0.4 });
                      const bgImage = svg
                        ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
                        : 'none';

                      return (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => store.setNoteStyle(style.value)}
                          className={`relative p-3 rounded-lg text-center transition-all duration-200 overflow-hidden
                            ${store.noteStyle === style.value
                              ? 'border-2 border-brand-500 bg-brand-500/15 shadow-lg shadow-brand-500/10'
                              : 'border-2 border-surface-700 bg-surface-900 hover:border-surface-600'
                            }`}
                        >
                          {/* Pattern preview */}
                          <div
                            className="absolute inset-0 opacity-40"
                            style={{ backgroundImage: bgImage }}
                          />
                          <div className="relative">
                            <div className={`mb-1.5 flex justify-center ${store.noteStyle === style.value ? 'text-brand-400' : 'text-surface-400'}`}>
                              {style.icon}
                            </div>
                            <div className={`text-xs font-bold ${store.noteStyle === style.value ? 'text-brand-400' : 'text-surface-300'}`}>{style.label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Note style controls */}
                  {store.noteStyle !== 'blank' && (
                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 pt-4 border-t border-surface-700">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs text-surface-400">Pattern Opacity</label>
                          <span className="text-[10px] text-surface-500">{Math.round(store.noteStyleOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={store.noteStyleOpacity}
                          onChange={(e) => store.setNoteStyleOpacity(parseFloat(e.target.value))}
                          className="w-full accent-brand-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs text-surface-400">Pattern Spacing</label>
                          <span className="text-[10px] text-surface-500">{store.lineSpacing}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="40"
                          step="2"
                          value={store.lineSpacing}
                          onChange={(e) => store.setLineSpacing(parseInt(e.target.value))}
                          className="w-full accent-brand-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* -------------------- ANSWERS TAB -------------------- */}
            {activeTab === 'answers' && exportFormat === 'pdf' && (
              <div className="space-y-5">
                {/* Answer Image Controls */}
                {store.exportType !== 'practice' ? (
                  <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <label className="text-xs font-bold text-surface-300 uppercase tracking-widest block">
                          Answer Image Size
                        </label>
                        <span className="text-xs text-emerald-400 font-mono font-bold px-2 py-0.5 bg-emerald-500/10 rounded">
                          {Math.round(store.answerImageScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={store.answerImageScale}
                        onChange={(e) => store.setAnswerImageScale(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <p className="text-[11px] text-surface-500 mt-2">
                        Scale down the answer image relative to its original cropped width.
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-surface-700">
                      <label className="text-xs font-bold text-surface-300 uppercase tracking-widest mb-3.5 block">
                        Answer Alignment
                      </label>
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => store.setAnswerPosition(pos)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2
                              ${store.answerPosition === pos
                                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50'
                                : 'bg-surface-900 text-surface-400 border-2 border-surface-700 hover:border-surface-600'
                              }`}
                          >
                            {pos === 'left' && <AlignLeft className="w-4 h-4 shrink-0" />}
                            {pos === 'center' && <AlignCenter className="w-4 h-4 shrink-0" />}
                            {pos === 'right' && <AlignRight className="w-4 h-4 shrink-0" />}
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-surface-900 rounded-xl border border-surface-800 border-dashed">
                    <p className="text-sm text-surface-500">Answers are not included in this export mode.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Area */}
          <div className="pt-4 mt-4 border-t border-surface-700 shrink-0">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="min-w-0 text-sm text-surface-400">
                <strong className="text-surface-200">{includedQuestions.length}</strong> question{includedQuestions.length !== 1 ? 's' : ''} ready to export
              </span>
              {isExporting && (
                <span className="text-xs text-brand-400 font-mono font-bold">
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
              <Button variant="ghost" onClick={closeModal} className="flex-1 max-w-[120px]">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExport}
                loading={isExporting}
                disabled={includedQuestions.length === 0}
                className="flex-1 shadow-lg shadow-brand-500/20"
              >
                {isExporting
                  ? 'Generating PDF...'
                  : `Export ${exportFormat.toUpperCase()} Document`
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        {exportFormat === 'pdf' && (
          <div className="hidden lg:block h-full min-h-[500px]">
            <ExportPreview />
          </div>
        )}
      </div>
    </Modal>
  );
}
