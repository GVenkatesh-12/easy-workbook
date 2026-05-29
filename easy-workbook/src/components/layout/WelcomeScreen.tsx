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
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto w-full max-w-xl"
      >
        {/* Logo / Brand */}
        <div className="mb-8 text-center sm:mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-5 inline-flex h-16 w-16 shadow-2xl shadow-brand-500/30 rounded-[1rem] sm:mb-6 sm:h-20 sm:w-20 sm:rounded-[1.25rem] overflow-hidden"
          >
            <img src="/favicon.svg" alt="Easy Workbook" className="w-full h-full object-cover" />
          </motion.div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-surface-100 sm:text-3xl">
            Easy Workbook
          </h1>
          <p className="text-base text-surface-400 sm:text-lg">
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
            p-6 text-center transition-all duration-300 ease-out sm:p-12
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
        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
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
