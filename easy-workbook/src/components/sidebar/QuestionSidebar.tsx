import { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuestionStore } from '@/store/questionStore';
import { useUiStore } from '@/store/uiStore';
import type { Question } from '@/types';
import { PdfTimeline } from './PdfTimeline';

/**
 * Sidebar containing all selected questions with drag-to-reorder.
 */
export function QuestionSidebar() {
  const questions = useQuestionStore((s) => s.questions);
  const reorderQuestions = useQuestionStore((s) => s.reorderQuestions);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const openModal = useUiStore((s) => s.openModal);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQuestions(oldIndex, newIndex);
      }
    }
  }, [questions, reorderQuestions]);

  const includedCount = questions.filter((q) => q.includedInExport).length;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'min(24rem, 90vw)', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-full min-h-0 border-l border-surface-700/50 bg-surface-900 flex shrink-0 flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-surface-700/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-surface-100">
                Questions
              </h3>
              <span className="rounded-lg bg-surface-800 px-2.5 py-1 text-xs text-surface-400 font-mono">
                {includedCount} / {questions.length}
              </span>
            </div>
            <p className="text-xs text-surface-500 mt-1.5">
              Drag to reorder • Click to navigate
            </p>
          </div>

          {/* Timeline slider */}
          <PdfTimeline />

          {/* Question list */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
            {questions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center h-full text-center px-8 py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-5">
                  <svg className="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <p className="text-sm text-surface-300 font-semibold mb-1.5">No questions selected</p>
                <p className="text-xs text-surface-500 leading-relaxed max-w-[200px]">
                  Switch to Select mode and drag on the PDF to crop question regions
                </p>
              </motion.div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-3">
                    {questions.map((question) => (
                      <SortableQuestionCard key={question.id} question={question} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Footer actions */}
          {questions.length > 0 && (
            <div className="shrink-0 border-t border-surface-700/50 px-4 py-3">
              <button
                onClick={() => openModal('export')}
                className="w-full py-2.5 px-4 rounded-lg bg-brand-500 hover:bg-brand-600
                  text-white text-sm font-semibold transition-all duration-200
                  active:scale-[0.98] flex items-center justify-center gap-2
                  shadow-lg shadow-brand-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export {includedCount} Question{includedCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Sortable Question Card ───

function SortableQuestionCard({ question }: { question: Question }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const removeQuestion = useQuestionStore((s) => s.removeQuestion);
  const duplicateQuestion = useQuestionStore((s) => s.duplicateQuestion);
  const toggleInclude = useQuestionStore((s) => s.toggleInclude);
  const setActiveQuestion = useQuestionStore((s) => s.setActiveQuestion);
  const removeAnswerCrops = useQuestionStore((s) => s.removeAnswerCrops);
  const setMode = useUiStore((s) => s.setMode);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleAddAnswer = () => {
    setActiveQuestion(question.id);
    setMode('answer-select');
  };

  const handleRemoveAnswer = () => {
    removeAnswerCrops(question.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group rounded-lg border transition-all duration-200
        ${question.includedInExport
          ? 'bg-surface-800/60 border-surface-700 hover:border-surface-500 shadow-sm hover:shadow-lg hover:-translate-y-0.5'
          : 'bg-surface-800/30 border-surface-800 opacity-60'
        }
      `}
    >
      {/* Main content row */}
      <div className="flex items-start gap-2.5 p-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 w-6 h-6 flex items-center justify-center text-surface-500 hover:text-surface-300 cursor-grab active:cursor-grabbing shrink-0 rounded-lg hover:bg-surface-700/50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
        </button>

        {/* Thumbnail */}
        <div className="w-16 h-12 rounded-md bg-surface-700 overflow-hidden shrink-0 border border-surface-600/50 shadow-inner flex items-center justify-center text-surface-500">
          {question.thumbnail ? (
            <img
              src={question.thumbnail}
              alt={question.label}
              className="w-full h-full object-cover"
            />
          ) : (
            <FileText className="w-5 h-5 opacity-50" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-brand-400">
              {question.label}
            </span>
            <span className="text-[11px] text-surface-500">
              p.{question.pageNumber + 1}
            </span>
            {question.answerCrops && question.answerCrops.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                Ans ✓
              </span>
            )}
          </div>
          <p className="text-[11px] text-surface-500 mt-1 truncate">
            {question.sourcePdfName}
          </p>
        </div>
      </div>

      {/* Action bar — always visible for touch, hover-reveal on desktop */}
      <div className="flex items-center gap-1.5 border-t border-surface-700/40 px-2.5 py-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 bg-surface-900/30 rounded-b-lg">
        {/* Add / Remove Answer */}
        {question.answerCrops && question.answerCrops.length > 0 ? (
          <button
            onClick={handleRemoveAnswer}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Remove answer region"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Answer
          </button>
        ) : (
          <button
            onClick={handleAddAnswer}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-surface-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Add answer region"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Answer
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Include/Exclude */}
        <button
          onClick={() => toggleInclude(question.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
          title={question.includedInExport ? 'Exclude from export' : 'Include in export'}
        >
          {question.includedInExport ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </button>

        {/* Duplicate */}
        <button
          onClick={() => duplicateQuestion(question.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
          title="Duplicate"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={() => removeQuestion(question.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Remove"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
