import { useState, useRef, useEffect } from 'react';
import { useQuestionStore } from '@/store/questionStore';
import { useExportStore } from '@/store/exportStore';
import type { Question, ExportType } from '@/types';
import { getNoteStyleSvg } from '@/lib/export/noteStyleRenderer';
import { getTheme } from '@/lib/export/themes';
import { FileText } from 'lucide-react';

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
  const invertCropColors = useExportStore((s) => s.invertCropColors);
  const removeBackground = useExportStore((s) => s.removeBackground);

  // Cover Page configuration
  const includeCoverPage = useExportStore((s) => s.includeCoverPage);
  const coverPageTitle = useExportStore((s) => s.coverPageTitle);
  const coverPageSubtitle = useExportStore((s) => s.coverPageSubtitle);
  const coverPageSubject = useExportStore((s) => s.coverPageSubject);
  const coverPageAuthor = useExportStore((s) => s.coverPageAuthor);
  const coverPageTheme = useExportStore((s) => s.coverPageTheme);

  // Watermark configuration
  const watermarkText = useExportStore((s) => s.watermarkText);
  const watermarkOpacity = useExportStore((s) => s.watermarkOpacity);

  // Header/Footer customization
  const headerLeft = useExportStore((s) => s.headerLeft);
  const headerRight = useExportStore((s) => s.headerRight);
  const headerRightCustom = useExportStore((s) => s.headerRightCustom);
  const footerLeft = useExportStore((s) => s.footerLeft);
  const footerRight = useExportStore((s) => s.footerRight);
  const footerRightCustom = useExportStore((s) => s.footerRightCustom);
  const showHeaderLine = useExportStore((s) => s.showHeaderLine);
  const showFooterLine = useExportStore((s) => s.showFooterLine);

  // Typography
  const fontFamily = useExportStore((s) => s.fontFamily);

  const theme = getTheme(themeName);
  const bgColor = customPageColor || theme.background;
  const noteSvg = getNoteStyleSvg(noteStyle, { lineColor: theme.lineColor, opacity: 0.4 });
  const noteBg = noteSvg ? `url("data:image/svg+xml,${encodeURIComponent(noteSvg)}")` : 'none';

  // Group into pages
  const pages: Question[][] = [];
  for (let i = 0; i < includedQuestions.length; i += questionsPerPage) {
    pages.push(includedQuestions.slice(i, i + questionsPerPage));
  }

  // Font CSS Family mapping
  const getFontFamilyCss = (family: typeof fontFamily) => {
    switch (family) {
      case 'times': return "font-serif font-['Times_New_Roman',_Times,_serif]";
      case 'courier': return "font-mono font-['Courier_New',_Courier,_monospace]";
      case 'helvetica':
      default: return "font-sans";
    }
  };

  const fontCssClass = getFontFamilyCss(fontFamily);

  return (
    <div className="h-full flex flex-col bg-surface-900 rounded-xl overflow-hidden border border-surface-700">
      <div className="shrink-0 px-4 py-3 border-b border-surface-700 bg-surface-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-surface-200 uppercase tracking-wider">Live Layout Preview</h3>
        <span className="text-xs text-surface-500 font-mono">
          {pages.length + (includeCoverPage ? 1 : 0)} Page{pages.length + (includeCoverPage ? 1 : 0) !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-950 flex flex-col gap-6 items-center">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText className="w-12 h-12 mb-3 text-surface-600" />
            <p className="text-sm font-medium text-surface-400">No questions selected</p>
          </div>
        ) : (
          <>
            {/* 1. Cover Page Preview */}
            {includeCoverPage && (
              <CoverPagePreview
                bgColor={bgColor}
                theme={theme}
                title={coverPageTitle}
                subtitle={coverPageSubtitle}
                subject={coverPageSubject}
                author={coverPageAuthor}
                styleTheme={coverPageTheme}
                fontFamilyClass={fontCssClass}
              />
            )}

            {/* 2. Content Pages */}
            {pages.map((pageQuestions, pageIdx) => (
              <div key={`page-${pageIdx}`} className="flex flex-col items-center w-full max-w-[400px]">
                <span className="text-xs text-surface-500 mb-2 font-mono">Page {pageIdx + 1 + (includeCoverPage ? 1 : 0)}</span>
                <div
                  className={`relative w-full shadow-xl overflow-hidden select-none ${fontCssClass}`}
                  style={{
                    aspectRatio: '1 / 1.414',
                    backgroundColor: bgColor,
                    backgroundImage: (exportType === 'practice' || exportType === 'combined') ? noteBg : 'none',
                    backgroundPosition: 'top left',
                  }}
                >
                  {/* Dynamic Watermark text */}
                  {watermarkText && (
                    <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden z-10"
                      style={{ opacity: watermarkOpacity }}
                    >
                      <span 
                        className="text-3xl font-extrabold tracking-widest text-center whitespace-nowrap select-none"
                        style={{ 
                          color: theme.accent,
                          transform: 'rotate(-45deg)',
                        }}
                      >
                        {watermarkText}
                      </span>
                    </div>
                  )}

                  {/* Custom Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 px-4 flex items-center justify-between z-20">
                    <span className="text-[8px] font-bold opacity-60 truncate max-w-[50%]" style={{ color: theme.accent }}>
                      {headerLeft || useExportStore.getState().pdfTitle || "Easy Workbook"}
                    </span>
                    <span className="text-[8px] font-semibold opacity-60 truncate max-w-[50%]" style={{ color: theme.headerText }}>
                      {headerRight === 'page' ? `Page ${pageIdx + 1} / ${pages.length}` :
                       headerRight === 'date' ? new Date().toLocaleDateString() :
                       headerRight === 'custom' ? headerRightCustom : ''}
                    </span>
                    {showHeaderLine && (
                      <div className="absolute bottom-0 left-4 right-4 h-px opacity-20" style={{ backgroundColor: theme.border }} />
                    )}
                  </div>

                  {/* Page Contents (Padded vertically to fit inside Header/Footer margins) */}
                  <div className="absolute inset-0 flex flex-col pt-9 pb-9 px-4">
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
                        invertCropColors={invertCropColors}
                        removeBackground={removeBackground}
                        onWeightChange={(delta) => {
                          if (qIdx === pageQuestions.length - 1) return;
                          
                          const currentWeight = q.spaceWeight ?? 1;
                          const nextQ = pageQuestions[qIdx + 1];
                          const nextWeight = nextQ.spaceWeight ?? 1;

                          const totalWeight = currentWeight + nextWeight;
                          
                          let newCurrentWeight = currentWeight + delta * totalWeight;
                          let newNextWeight = nextWeight - delta * totalWeight;

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

                  {/* Custom Footer */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 px-4 flex items-center justify-between z-20">
                    <span className="text-[8px] font-semibold opacity-50 truncate max-w-[50%]" style={{ color: theme.headerText }}>
                      {footerLeft}
                    </span>
                    <span className="text-[8px] font-medium opacity-50 truncate max-w-[50%]" style={{ color: theme.headerText }}>
                      {footerRight === 'page' ? `Page ${pageIdx + 1} / ${pages.length}` :
                       footerRight === 'date' ? new Date().toLocaleDateString() :
                       footerRight === 'custom' ? footerRightCustom : ''}
                    </span>
                    {showFooterLine && (
                      <div className="absolute top-0 left-4 right-4 h-px opacity-20" style={{ backgroundColor: theme.border }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CoverPagePreview({
  bgColor,
  theme,
  title,
  subtitle,
  subject,
  author,
  styleTheme,
  fontFamilyClass
}: {
  bgColor: string;
  theme: any;
  title: string;
  subtitle: string;
  subject: string;
  author: string;
  styleTheme: 'minimal' | 'modern' | 'classic' | 'geometric';
  fontFamilyClass: string;
}) {
  const accentColor = theme.accent;
  const textColor = theme.headerText;
  const bodyColor = theme.bodyText;
  const dateText = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const titleVal = title || "Easy Workbook";
  const subtitleVal = subtitle || "Practice Question Set";
  const subjectVal = subject || "General";
  const authorVal = author || "Easy Workbook Creator";

  return (
    <div key="cover-page" className="flex flex-col items-center w-full max-w-[400px]">
      <span className="text-xs text-surface-500 mb-2 font-mono">Cover Page</span>
      <div
        className={`relative w-full shadow-xl overflow-hidden select-none ${fontFamilyClass}`}
        style={{
          aspectRatio: '1 / 1.414',
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        {styleTheme === 'modern' && (
          <div className="absolute inset-0 flex flex-col justify-between p-8 text-left">
            <div className="absolute top-0 left-0 right-0 h-[38%] opacity-15" style={{ backgroundColor: accentColor }} />
            <div className="absolute top-[38%] right-0 w-32 h-32 rounded-full opacity-20 translate-x-12 -translate-y-12" style={{ backgroundColor: accentColor }} />
            <div className="absolute bottom-[20%] left-0 w-24 h-24 rounded-full opacity-10 -translate-x-8" style={{ backgroundColor: accentColor }} />
            
            <div className="mt-16 z-10">
              <span className="px-2.5 py-1 text-[8px] font-bold tracking-wider text-white rounded-sm shadow-sm" style={{ backgroundColor: accentColor }}>
                {subjectVal.toUpperCase()}
              </span>
            </div>
            
            <div className="my-auto z-10 space-y-2">
              <h1 className="text-xl font-black leading-tight" style={{ color: textColor }}>{titleVal}</h1>
              <p className="text-[10px] font-medium opacity-80" style={{ color: bodyColor }}>{subtitleVal}</p>
            </div>
            
            <div className="mt-auto border-t-2 pt-3 z-10" style={{ borderColor: accentColor }}>
              <p className="text-[9px] font-bold">Created by: {authorVal}</p>
              <p className="text-[8px] opacity-70 mt-0.5">{dateText}</p>
            </div>
          </div>
        )}

        {styleTheme === 'classic' && (
          <div className="absolute inset-0 p-8 flex flex-col justify-between text-center">
            <div className="absolute inset-4 border-2" style={{ borderColor: accentColor }} />
            <div className="absolute inset-5 border border-dashed opacity-50" style={{ borderColor: accentColor }} />
            
            <div className="mt-12 z-10">
              <span className="text-[9px] font-bold tracking-widest" style={{ color: accentColor }}>
                {subjectVal.toUpperCase()}
              </span>
            </div>
            
            <div className="my-auto z-10 space-y-3">
              <h1 className="text-lg font-bold leading-tight tracking-wide px-3" style={{ color: textColor }}>{titleVal}</h1>
              <div className="w-12 h-0.5 mx-auto" style={{ backgroundColor: accentColor }} />
              <p className="text-[10px] italic opacity-75" style={{ color: bodyColor }}>{subtitleVal}</p>
            </div>
            
            <div className="mb-10 z-10 space-y-0.5">
              <p className="text-[9px] font-bold">By {authorVal}</p>
              <p className="text-[8px] opacity-60">{dateText}</p>
            </div>
          </div>
        )}

        {styleTheme === 'geometric' && (
          <div className="absolute inset-0 p-8 flex flex-col justify-between text-left">
            <div className="absolute inset-0 opacity-5 overflow-hidden">
              <div className="w-full h-full bg-grid-pattern" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${accentColor} 0px, ${accentColor} 1px, transparent 1px, transparent 10px)` }} />
            </div>
            
            <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
            
            <div className="mt-10 flex gap-2.5 items-center">
              <div className="w-1 h-12" style={{ backgroundColor: accentColor }} />
              <span className="text-[10px] font-black tracking-wider" style={{ color: accentColor }}>
                {subjectVal.toUpperCase()}
              </span>
            </div>
            
            <div className="my-auto space-y-1.5">
              <h1 className="text-xl font-black leading-none" style={{ color: textColor }}>{titleVal}</h1>
              <p className="text-[10px] font-semibold opacity-75" style={{ color: bodyColor }}>{subtitleVal}</p>
            </div>
            
            <div className="mt-auto">
              <p className="text-[9px] font-bold" style={{ color: textColor }}>{authorVal}</p>
              <p className="text-[8px] opacity-60 mt-0.5">{dateText}</p>
            </div>
          </div>
        )}

        {styleTheme === 'minimal' && (
          <div className="absolute inset-0 p-8 flex flex-col justify-between text-left">
            <div className="absolute top-10 bottom-10 left-5 w-px opacity-30" style={{ backgroundColor: accentColor }} />
            
            <div className="mt-10 ml-5">
              <span className="text-[8px] font-black tracking-widest" style={{ color: accentColor }}>
                {subjectVal.toUpperCase()}
              </span>
            </div>
            
            <div className="my-auto ml-5 space-y-1.5">
              <h1 className="text-xl font-extrabold leading-tight tracking-tight" style={{ color: textColor }}>{titleVal}</h1>
              <p className="text-[10px] font-medium opacity-80" style={{ color: bodyColor }}>{subtitleVal}</p>
            </div>
            
            <div className="mb-10 ml-5 space-y-0.5">
              <p className="text-[9px] font-bold">Created by {authorVal}</p>
              <p className="text-[8px] opacity-60">{dateText}</p>
            </div>
          </div>
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
  invertCropColors,
  removeBackground,
  onWeightChange,
}: {
  question: Question;
  isLast: boolean;
  exportType: ExportType;
  theme: ReturnType<typeof getTheme>;
  imageScale: number;
  answerImageScale: number;
  answerPosition: 'left' | 'center' | 'right';
  invertCropColors: boolean;
  removeBackground: boolean;
  onWeightChange: (delta: number) => void;
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const weight = question.spaceWeight ?? 1;

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !blockRef.current) return;
      
      const parent = blockRef.current.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const parentHeight = parentRect.height;
      
      const movementY = e.movementY;
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
      <div className="flex-1 flex flex-col min-h-0 border-b border-dashed border-black/10 pb-1 mb-1">
        {/* Question Header */}
        <div className="flex items-center gap-1.5 mb-0.5 shrink-0">
          <span className="text-[8px] font-bold px-1 rounded-sm text-white" style={{ backgroundColor: theme.accent }}>
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
            maxHeight: '90%',
            flexShrink: 0
          }}
        >
          {question.thumbnail ? (
            <img 
              src={question.thumbnail} 
              alt={question.label}
              className="w-full h-full object-contain object-top"
              style={{ 
                filter: invertCropColors ? 'invert(1) hue-rotate(180deg)' : 'none',
                mixBlendMode: removeBackground && !invertCropColors ? 'multiply' : 'normal'
              }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full border border-dashed border-black/20 flex items-center justify-center text-[8px] text-black/40">
              [Image]
            </div>
          )}
        </div>

        {/* Solving Space */}
        {(exportType === 'practice' || exportType === 'combined') && (
          <div className="flex-1 w-full mt-0.5 border-t border-black/5 min-h-0" />
        )}

        {/* Optional Answer preview */}
        {(exportType === 'combined' || exportType === 'answer-key') && question.answerCrops && question.answerCrops.length > 0 && (
          <div className="border-t border-emerald-500/30 bg-emerald-500/5 mt-0.5 relative overflow-hidden flex flex-col min-h-[30px] shrink-0 p-1.5">
            <div className="absolute top-0.5 left-1.5 text-[7px] text-emerald-600 font-bold uppercase tracking-wider z-10">
              Answer Region
            </div>
            {question.answerThumbnail ? (
              <div 
                className={`flex w-full pt-2 ${
                  answerPosition === 'center' ? 'justify-center' :
                  answerPosition === 'right' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div style={{ width: `${answerImageScale * 100}%` }}>
                  <img 
                    src={question.answerThumbnail} 
                    alt="Answer" 
                    className="w-full h-auto object-contain object-top" 
                    style={{ 
                      filter: invertCropColors ? 'invert(1) hue-rotate(180deg)' : 'none',
                      mixBlendMode: removeBackground && !invertCropColors ? 'multiply' : 'normal'
                    }}
                    draggable={false} 
                  />
                </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center text-[7px] text-emerald-600/50 pt-1.5">Processing...</div>
            )}
          </div>
        )}
      </div>

      {/* Drag Handle */}
      {!isLast && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-2 translate-y-1 z-10 cursor-row-resize flex items-center justify-center group ${isDragging ? 'bg-brand-500/20' : 'hover:bg-brand-500/10'}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
        >
          <div className={`w-6 h-0.5 rounded-full transition-colors ${isDragging ? 'bg-brand-500' : 'bg-surface-400 group-hover:bg-brand-400'}`} />
        </div>
      )}
    </div>
  );
}
