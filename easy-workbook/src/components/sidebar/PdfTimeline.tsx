import React, { useState, useRef } from 'react';
import { usePdfStore } from '@/store/pdfStore';
import { useQuestionStore } from '@/store/questionStore';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';

export function PdfTimeline() {
  const totalPages = usePdfStore((s) => s.totalPages);
  const currentPage = usePdfStore((s) => s.currentPage);
  const jumpToPage = usePdfStore((s) => s.jumpToPage);
  const questions = useQuestionStore((s) => s.questions);

  const trackRef = useRef<HTMLDivElement>(null);
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (totalPages <= 1) return null;

  // Group questions by page
  const questionsByPage = new Map<number, typeof questions>();
  questions.forEach((q) => {
    const pageQuestions = questionsByPage.get(q.pageNumber) || [];
    pageQuestions.push(q);
    questionsByPage.set(q.pageNumber, pageQuestions);
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newPage = Math.min(Math.floor(percentage * totalPages), totalPages - 1);
    jumpToPage(newPage);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const direction = e.deltaY > 0 ? 1 : -1;
    const newPage = Math.max(0, Math.min(currentPage + direction, totalPages - 1));
    if (newPage !== currentPage) {
      jumpToPage(newPage);
    }
  };

  // Attach global pointer events when dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, totalPages]);

  const thumbPosition = (currentPage / Math.max(1, totalPages - 1)) * 100;

  return (
    <div className="px-4 py-3 border-b border-surface-700/50 bg-surface-900/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
          Document Timeline
        </span>
        <span className="text-[10px] text-surface-400 font-mono">
          Pg {currentPage + 1}
        </span>
      </div>

      <div
        className="relative h-6 flex items-center group cursor-pointer"
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
      >
        {/* Track */}
        <div
          ref={trackRef}
          className="w-full h-1.5 bg-surface-700 rounded-full overflow-visible relative"
        >
          {/* Active Track (Fill) */}
          <div
            className="absolute top-0 left-0 h-full bg-brand-500/50 rounded-full pointer-events-none"
            style={{ width: `${thumbPosition}%` }}
          />

          {/* Question Markers */}
          {Array.from(questionsByPage.entries()).map(([page, pageQs]) => {
            const pos = (page / Math.max(1, totalPages - 1)) * 100;
            const isHovered = hoveredPage === page;
            const isActive = currentPage === page;

            return (
              <div
                key={page}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${pos}%` }}
                onMouseEnter={() => setHoveredPage(page)}
                onMouseLeave={() => setHoveredPage(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToPage(page);
                }}
              >
                {/* Marker Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 border-surface-900 transition-all duration-200 
                    ${isActive ? 'bg-white scale-125 z-20' : 'bg-brand-400 hover:bg-brand-300 hover:scale-125 z-10'}`}
                />

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && !isDragging && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, x: `-${pos}%`, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, x: `-${pos}%`, scale: 1 }}
                      exit={{ opacity: 0, y: -5, x: `-${pos}%`, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 z-50 pointer-events-none"
                      style={{ left: 0 }}
                    >
                      <div className="bg-surface-800 border border-surface-700 shadow-xl rounded-lg p-2">
                        <div className="text-[10px] text-surface-400 font-semibold mb-1.5 flex justify-between items-center">
                          <span>Page {page + 1}</span>
                          <span className="bg-surface-700 px-1.5 py-0.5 rounded text-surface-200">
                            {pageQs.length} Q{pageQs.length !== 1 && 's'}
                          </span>
                        </div>
                        <div className={`grid gap-1.5 ${
                          pageQs.length === 1 ? 'grid-cols-1 w-[140px]' :
                          pageQs.length <= 4 ? 'grid-cols-2 w-[180px]' :
                          pageQs.length <= 9 ? 'grid-cols-3 w-[240px]' :
                          'grid-cols-4 w-[280px]'
                        }`}>
                          {pageQs.slice(0, pageQs.length === 1 ? 1 : pageQs.length <= 4 ? 4 : pageQs.length <= 9 ? 9 : 16).map((q) => (
                            <div key={q.id} className="w-full aspect-[4/3] rounded bg-surface-900 overflow-hidden border border-surface-700/50 relative">
                              {q.thumbnail ? (
                                <img src={q.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-surface-600">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="absolute top-0.5 left-0.5 bg-black/60 text-[8px] font-bold px-1 rounded text-white backdrop-blur-sm shadow-sm border border-white/10">
                                {q.label}
                              </div>
                            </div>
                          ))}
                          {pageQs.length > 16 && (
                            <div className="col-span-4 text-center text-[9px] text-surface-500 font-medium pt-1 border-t border-surface-700/50 mt-1">
                              + {pageQs.length - 16} more
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Current Page Thumb (Interactive) */}
          <div
            className="absolute top-1/2 w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none transition-transform duration-100 ease-out z-30 flex items-end justify-center"
            style={{ 
              left: `${thumbPosition}%`, 
              // translate -50% X to center it horizontally, -100% Y to put the pin's tip on the track
              transform: `translate(-50%, -100%) ${isDragging ? 'scale(1.2)' : ''}` 
            }}
          >
            <MapPin className="w-full h-full fill-brand-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
