import { useState, useRef, useEffect } from 'react';
import { useQuestionStore } from '@/store/questionStore';
import { useExportStore } from '@/store/exportStore';
import type { Question, ExportType } from '@/types';
import { getNoteStyleSvg } from '@/lib/export/noteStyleRenderer';
import { getTheme } from '@/lib/export/themes';

export function ExportPreview() {
  const questions = useQuestionStore((s) => s.questions);
  const setQuestionSpaceWeight = useQuestionStore((s) => s.setQuestionSpaceWeight);
  const includedQuestions = questions.filter((q) => q.includedInExport);

  // Read export settings
  const exportType = useExportStore((s) => s.exportType);
  const questionsPerPage = useExportStore((s) => s.questionsPerPage);
  const noteStyle = useExportStore((s) => s.noteStyle);
  const themeName = useExportStore((s) => s.theme);
  const questionImageScale = useExportStore((s) => s.questionImageScale);
  const answerImageScale = useExportStore((s) => s.answerImageScale);
  const answerPosition = useExportStore((s) => s.answerPosition);

  const customPageColor = useExportStore((s) => s.customPageColor);

  const theme = getTheme(themeName);
  const bgColor = customPageColor || theme.background;
  const noteSvg = getNoteStyleSvg(noteStyle, { lineColor: theme.lineColor, opacity: 0.4 });
  const noteBg = noteSvg ? `url("data:image/svg+xml,${encodeURIComponent(noteSvg)}")` : 'none';

  // Group into pages
  const pages: Question[][] = [];
  for (let i = 0; i < includedQuestions.length; i += questionsPerPage) {
    pages.push(includedQuestions.slice(i, i + questionsPerPage));
  }

  return (
    <div className="h-full flex flex-col bg-surface-900 rounded-xl overflow-hidden border border-surface-700">
      <div className="shrink-0 px-4 py-3 border-b border-surface-700 bg-surface-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-surface-200 uppercase tracking-wider">Live Layout Preview</h3>
        <span className="text-xs text-surface-500 font-mono">{pages.length} Page{pages.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-950 flex flex-col gap-6 items-center">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <span className="text-4xl mb-3">📄</span>
            <p className="text-sm font-medium text-surface-400">No questions selected</p>
          </div>
        ) : (
          pages.map((pageQuestions, pageIdx) => (
            <div key={`page-${pageIdx}`} className="flex flex-col items-center w-full max-w-[400px]">
              <span className="text-xs text-surface-500 mb-2 font-mono">Page {pageIdx + 1}</span>
              <div
                className="relative w-full shadow-xl overflow-hidden"
                style={{
                  aspectRatio: '1 / 1.414',
                  backgroundColor: bgColor,
                  backgroundImage: (exportType === 'practice' || exportType === 'combined') ? noteBg : 'none',
                  backgroundPosition: 'top left',
                }}
              >
                <div className="absolute inset-0 flex flex-col p-4">
                  {pageQuestions.map((q, qIdx) => (
                    <QuestionBlock
                      key={q.id}
                      question={q}
                      isLast={qIdx === pageQuestions.length - 1}
                      exportType={exportType}
                      theme={theme}
                      imageScale={questionImageScale}
                      answerImageScale={answerImageScale}
                      answerPosition={answerPosition}
                      onWeightChange={(delta) => {
                        // Delta is a number from -1 to 1 (representing a shift in ratio)
                        // This updates the weights of this question and the NEXT question.
                        if (qIdx === pageQuestions.length - 1) return;
                        
                        const currentWeight = q.spaceWeight ?? 1;
                        const nextQ = pageQuestions[qIdx + 1];
                        const nextWeight = nextQ.spaceWeight ?? 1;

                        const totalWeight = currentWeight + nextWeight;
                        
                        // New weight for current Q
                        let newCurrentWeight = currentWeight + delta * totalWeight;
                        let newNextWeight = nextWeight - delta * totalWeight;

                        // Clamp weights to prevent completely squashing a question
                        const MIN_WEIGHT = 0.2;
                        if (newCurrentWeight < MIN_WEIGHT) {
                          newCurrentWeight = MIN_WEIGHT;
                          newNextWeight = totalWeight - MIN_WEIGHT;
                        } else if (newNextWeight < MIN_WEIGHT) {
                          newNextWeight = MIN_WEIGHT;
                          newCurrentWeight = totalWeight - MIN_WEIGHT;
                        }

                        setQuestionSpaceWeight(q.id, newCurrentWeight);
                        setQuestionSpaceWeight(nextQ.id, newNextWeight);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuestionBlock({
  question,
  isLast,
  exportType,
  theme,
  imageScale,
  answerImageScale,
  answerPosition,
  onWeightChange,
}: {
  question: Question;
  isLast: boolean;
  exportType: ExportType;
  theme: ReturnType<typeof getTheme>;
  imageScale: number;
  answerImageScale: number;
  answerPosition: 'left' | 'center' | 'right';
  onWeightChange: (delta: number) => void;
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // The proportion this block takes up in CSS flex.
  const weight = question.spaceWeight ?? 1;

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !blockRef.current) return;
      
      const parent = blockRef.current.parentElement;
      if (!parent) return;

      // Calculate vertical delta as a percentage of the parent height
      const parentRect = parent.getBoundingClientRect();
      const parentHeight = parentRect.height;
      
      // Movement in pixels
      const movementY = e.movementY;
      
      // Convert to a ratio
      const deltaRatio = movementY / parentHeight;
      
      onWeightChange(deltaRatio);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onWeightChange]);

  return (
    <div
      ref={blockRef}
      className="relative flex flex-col"
      style={{ flex: weight }}
    >
      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-dashed border-black/10 pb-2 mb-2">
        {/* Question Header */}
        <div className="flex items-center gap-2 mb-1 shrink-0">
          <span className="text-[10px] font-bold px-1 rounded-sm" style={{ backgroundColor: theme.accent, color: '#fff' }}>
            {question.label}
          </span>
          <div className="h-px flex-1 bg-black/5" />
        </div>

        {/* Thumbnail Preview Area */}
        <div 
          className="flex flex-col gap-1 overflow-hidden relative"
          style={{ 
            height: `${imageScale * 100}%`,
            width: `${imageScale * 100}%`,
            maxHeight: '95%',
            flexShrink: 0
          }}
        >
          {question.thumbnail ? (
            <img 
              src={question.thumbnail} 
              alt={question.label}
              className="w-full h-full object-contain object-top"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full border border-dashed border-black/20 flex items-center justify-center text-[10px] text-black/40">
              [Image]
            </div>
          )}
        </div>

        {/* Solving Space (Transparent to show page background) */}
        {(exportType === 'practice' || exportType === 'combined') && (
          <div className="flex-1 w-full mt-1 border-t border-black/5 min-h-0" />
        )}

        {/* Optional Answer preview */}
        {(exportType === 'combined' || exportType === 'answer-key') && question.answerCrop && (
          <div className="border-t border-emerald-500/30 bg-emerald-500/5 mt-1 relative overflow-hidden flex flex-col min-h-[40px] shrink-0 p-2">
            <div className="absolute top-1 left-2 text-[9px] text-emerald-600 font-bold uppercase tracking-wider z-10">
              Answer Region
            </div>
            {question.answerThumbnail ? (
              <div 
                className={`flex w-full pt-3 ${
                  answerPosition === 'center' ? 'justify-center' :
                  answerPosition === 'right' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div style={{ width: `${answerImageScale * 100}%` }}>
                  <img src={question.answerThumbnail} alt="Answer" className="w-full h-auto object-contain object-top" draggable={false} />
                </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center text-[9px] text-emerald-600/50 pt-2">Processing...</div>
            )}
          </div>
        )}
      </div>

      {/* Drag Handle */}
      {!isLast && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-3 translate-y-1.5 z-10 cursor-row-resize flex items-center justify-center group ${isDragging ? 'bg-brand-500/20' : 'hover:bg-brand-500/10'}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
        >
          <div className={`w-8 h-1 rounded-full transition-colors ${isDragging ? 'bg-brand-500' : 'bg-surface-400 group-hover:bg-brand-400'}`} />
        </div>
      )}
    </div>
  );
}
