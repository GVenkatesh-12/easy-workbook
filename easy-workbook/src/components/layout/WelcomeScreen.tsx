import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePdfLoader } from '@/hooks/usePdfLoader';

/**
 * Welcome screen shown when no PDF is loaded.
 * Features a drag-and-drop zone with premium aesthetics.
 */
export function WelcomeScreen() {
  const { handleFileDrop, handleFileSelect } = usePdfLoader();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    setIsDragOver(false);
    handleFileDrop(e);
  }, [handleFileDrop]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-xl"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
              bg-gradient-to-br from-brand-500 to-indigo-600 shadow-2xl shadow-brand-500/30 mb-6"
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-surface-100 tracking-tight mb-2">
            Easy Workbook
          </h1>
          <p className="text-surface-400 text-lg">
            Convert workbook PDFs into structured practice notebooks
          </p>
        </div>

        {/* Drop Zone */}
        <motion.div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed
            p-12 text-center transition-all duration-300 ease-out
            ${isDragOver
              ? 'border-brand-400 bg-brand-500/10 scale-[1.02]'
              : 'border-surface-600 hover:border-surface-400 bg-surface-900/50'
            }
          `}
        >
          {/* Upload Icon */}
          <div className={`
            mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors
            ${isDragOver ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-400'}
          `}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <p className="text-surface-200 font-medium text-lg mb-2">
            {isDragOver ? 'Drop your PDF here' : 'Drop a PDF workbook here'}
          </p>
          <p className="text-surface-500 text-sm">
            or tap to browse • Supports large PDFs (500+ pages)
          </p>

          {/* Subtle glow effect on drag */}
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl bg-brand-500/5 pointer-events-none"
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>

        {/* Quick tips */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: '📄', label: 'Open PDF', desc: 'Load any workbook' },
            { icon: '✂️', label: 'Select Questions', desc: 'Crop & organize' },
            { icon: '📝', label: 'Generate Notebook', desc: 'Export practice PDF' },
          ].map((tip) => (
            <motion.div
              key={tip.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-4 rounded-xl bg-surface-900/50 border border-surface-800"
            >
              <div className="text-2xl mb-2">{tip.icon}</div>
              <div className="text-sm font-medium text-surface-200">{tip.label}</div>
              <div className="text-xs text-surface-500 mt-1">{tip.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
