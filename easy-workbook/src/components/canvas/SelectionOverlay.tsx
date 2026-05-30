import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useUiStore } from '@/store/uiStore';
import { useQuestionStore } from '@/store/questionStore';
import { usePdfStore } from '@/store/pdfStore';
import { useThumbnail } from '@/hooks/useThumbnail';
import {
  stageRectToNormalized,
  normalizedRectToStage,
  clampNormalizedRect,
  hasArea,
} from '@/lib/canvas/coordinateUtils';
import { extractMergedCropsAsDataUrl } from '@/lib/export/cropExtractor';

interface SelectionOverlayProps {
  pageIndex: number;
  width: number;
  height: number;
}

interface DrawingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type SelectionPhase = 'idle' | 'drawing' | 'adjusting';

/**
 * Konva-based selection overlay for a single PDF page.
 * 
 * Flow:
 * 1. User drags to draw a rectangle (drawing phase)
 * 2. Rectangle becomes resizable/movable with confirm/cancel (adjusting phase)  
 * 3. User confirms → question is added to the store
 * 4. User can then optionally add an answer region for that question
 */
export function SelectionOverlay({ pageIndex, width, height }: SelectionOverlayProps) {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const addQuestion = useQuestionStore((s) => s.addQuestion);
  const setActiveQuestion = useQuestionStore((s) => s.setActiveQuestion);
  const setAnswerCrops = useQuestionStore((s) => s.setAnswerCrops);
  const questions = useQuestionStore((s) => s.questions);
  const pendingQuestionCrops = useQuestionStore((s) => s.pendingQuestionCrops);
  const addPendingCrop = useQuestionStore((s) => s.addPendingCrop);
  const clearPendingCrops = useQuestionStore((s) => s.clearPendingCrops);
  const pendingAnswerCrops = useQuestionStore((s) => s.pendingAnswerCrops);
  const addPendingAnswerCrop = useQuestionStore((s) => s.addPendingAnswerCrop);
  const clearPendingAnswerCrops = useQuestionStore((s) => s.clearPendingAnswerCrops);
  const pdfFile = usePdfStore((s) => s.pdfFile);
  const addToast = useUiStore((s) => s.addToast);
  const { generateThumbnail } = useThumbnail();

  // Selection state machine
  const [phase, setPhase] = useState<SelectionPhase>('idle');
  const [drawingRect, setDrawingRect] = useState<DrawingRect | null>(null);
  const [pendingRect, setPendingRect] = useState<DrawingRect | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  // Konva refs for the adjustable rect + transformer
  const pendingRectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Answer select mode state — which question we're adding an answer to
  const [answerForQuestionId, setAnswerForQuestionId] = useState<string | null>(null);

  const isSelectionMode = mode === 'select';
  const isAnswerMode = mode === 'answer-select';
  const isActive = isSelectionMode || isAnswerMode;

  // Questions that have at least one part on this page
  const pageQuestions = questions.filter((q) => 
    q.questionCrops.some(crop => (crop.pageNumber ?? q.pageNumber) === pageIndex)
  );
  
  // Answers on this page
  const pageAnswers = questions.filter((q) => q.answerCrops && q.answerCrops.some(crop => (crop.pageNumber ?? q.pageNumber) === pageIndex));

  // Attach transformer to pending rect when in adjusting phase
  useEffect(() => {
    if (phase === 'adjusting' && pendingRectRef.current && transformerRef.current) {
      transformerRef.current.nodes([pendingRectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [phase]);

  // Listen for answer-select mode changes from sidebar
  useEffect(() => {
    const unsub = useUiStore.subscribe((state, prevState) => {
      if (state.mode === 'answer-select' && prevState.mode !== 'answer-select') {
        // Store which question needs an answer — it's the activeQuestionId or last added
        const activeId = useQuestionStore.getState().activeQuestionId;
        if (activeId) {
          setAnswerForQuestionId(activeId);
        }
      }
      if (state.mode !== 'answer-select') {
        setAnswerForQuestionId(null);
      }
    });
    return unsub;
  }, []);

  // ─── Drawing handlers ───

  const handlePointerDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isActive) return;
    if (phase === 'adjusting') return; // Don't start new draw while adjusting

    const stage = e.target.getStage();
    if (!stage) return;

    // Don't start drawing if clicking on an existing shape
    if (e.target !== stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    startPointRef.current = { x: pos.x, y: pos.y };
    setPhase('drawing');
    setDrawingRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }, [isActive, phase]);

  const handlePointerMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (phase !== 'drawing' || !startPointRef.current) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const start = startPointRef.current;
    const x = Math.min(start.x, pos.x);
    const y = Math.min(start.y, pos.y);
    const w = Math.abs(pos.x - start.x);
    const h = Math.abs(pos.y - start.y);

    setDrawingRect({ x, y, width: w, height: h });
  }, [phase]);

  const handlePointerUp = useCallback(() => {
    if (phase !== 'drawing' || !drawingRect) return;

    // Check minimum area before switching to adjusting
    const normalized = stageRectToNormalized(drawingRect, width, height);
    if (!hasArea(normalized, 0.001)) {
      setPhase('idle');
      setDrawingRect(null);
      startPointRef.current = null;
      return;
    }

    // Move to adjusting phase — show the rect with handles
    setPendingRect({ ...drawingRect });
    setDrawingRect(null);
    setPhase('adjusting');
    startPointRef.current = null;
  }, [phase, drawingRect, width, height]);

  const handleAddPart = useCallback(() => {
    if (!pendingRect) return;
    
    const node = pendingRectRef.current;
    let finalRect = pendingRect;
    if (node) {
      finalRect = {
        x: node.x(),
        y: node.y(),
        width: node.width() * node.scaleX(),
        height: node.height() * node.scaleY(),
      };
    }

    const normalized = clampNormalizedRect(
      stageRectToNormalized(finalRect, width, height)
    );

    if (!hasArea(normalized, 0.001)) {
      addToast('Selection too small', 'error');
      handleCancel();
      return;
    }

    if (isAnswerMode) {
      addPendingAnswerCrop({ ...normalized, rotation: 0, pageNumber: pageIndex });
    } else {
      addPendingCrop({ ...normalized, rotation: 0, pageNumber: pageIndex });
    }
    addToast('Part added. Select the next part.', 'info');
    
    // Reset local drawing state to allow another selection
    setPendingRect(null);
    setDrawingRect(null);
    setPhase('idle');
    startPointRef.current = null;
  }, [pendingRect, width, height, pageIndex, addPendingCrop, addPendingAnswerCrop, isAnswerMode, addToast]);

  // ─── Confirm / Cancel ───

  const handleConfirm = useCallback(async () => {
    if (!pendingRect || !pdfFile) return;

    // Get the final rect position (might have been moved/resized)
    const node = pendingRectRef.current;
    let finalRect = pendingRect;
    if (node) {
      // Account for transforms (scale/position from dragging/resizing)
      finalRect = {
        x: node.x(),
        y: node.y(),
        width: node.width() * node.scaleX(),
        height: node.height() * node.scaleY(),
      };
    }

    const normalized = clampNormalizedRect(
      stageRectToNormalized(finalRect, width, height)
    );

    if (!hasArea(normalized, 0.001)) {
      addToast('Selection too small', 'error');
      handleCancel();
      return;
    }

    if (isAnswerMode && answerForQuestionId) {
      // Adding an answer region to an existing question
      const finalCrop = { ...normalized, rotation: 0, pageNumber: pageIndex };
      const allAnswerCrops = [...pendingAnswerCrops, finalCrop];
      
      let answerThumbnail: string | undefined;
      try {
        answerThumbnail = await extractMergedCropsAsDataUrl(allAnswerCrops, 1.5);
      } catch {}

      setAnswerCrops(answerForQuestionId, allAnswerCrops, answerThumbnail);
      addToast('Answer region added', 'success');
      setMode('select'); // Return to select mode
    } else {
      // Adding a new question (combining any pending crops + this final one)
      const finalCrop = { ...normalized, rotation: 0, pageNumber: pageIndex };
      const allCrops = [...pendingQuestionCrops, finalCrop];
      
      let thumbnail: string | undefined;
      try {
        // Generate a merged thumbnail from all parts
        thumbnail = await extractMergedCropsAsDataUrl(allCrops, 1.5);
      } catch {
        // Non-critical
      }

      const newId = addQuestion({
        sourcePdfName: pdfFile.name,
        pageNumber: allCrops[0].pageNumber ?? pageIndex, // Main page is the first part's page
        questionCrops: allCrops,
        thumbnail,
      });
      // Set as active so answer-select can target it
      setActiveQuestion(newId);
      addToast(`Question selected`, 'success');
    }

    // Reset
    setPendingRect(null);
    setPhase('idle');
    clearPendingCrops();
    clearPendingAnswerCrops();
  }, [pendingRect, pdfFile, width, height, isAnswerMode, answerForQuestionId, setAnswerCrops, addQuestion, setActiveQuestion, addToast, setMode, pageIndex, generateThumbnail, pendingQuestionCrops, clearPendingCrops, pendingAnswerCrops, clearPendingAnswerCrops]);

  const handleCancel = useCallback(() => {
    setPendingRect(null);
    setDrawingRect(null);
    setPhase('idle');
    startPointRef.current = null;
    clearPendingCrops();
    clearPendingAnswerCrops();
    if (isAnswerMode) {
      setMode('select');
    }
  }, [isAnswerMode, setMode, clearPendingCrops, clearPendingAnswerCrops]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    if (phase !== 'adjusting') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, handleConfirm, handleCancel]);

  // Calculate button positions for the floating confirm/cancel UI
  const getButtonPosition = () => {
    if (!pendingRect) return { x: 0, y: 0 };
    const node = pendingRectRef.current;
    if (node) {
      return {
        x: node.x() + node.width() * node.scaleX(),
        y: node.y() + node.height() * node.scaleY() + 8,
      };
    }
    return {
      x: pendingRect.x + pendingRect.width,
      y: pendingRect.y + pendingRect.height + 8,
    };
  };

  const btnPos = getButtonPosition();

  return (
    <>
      <Stage
        width={width}
        height={height}
        className={`konva-container ${isActive ? 'active' : ''}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
      >
        <Layer>
          {/* ── Existing confirmed selections on this page ── */}
          {pageQuestions.map((q) => (
            <Group key={q.id}>
              {q.questionCrops.map((crop, idx) => {
                // Only draw parts that belong to this page
                if ((crop.pageNumber ?? q.pageNumber) !== pageIndex) return null;
                
                const rect = normalizedRectToStage(crop, width, height);
                return (
                  <Group key={`${q.id}-part-${idx}`}>
                    <Rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.width}
                      height={rect.height}
                      fill="rgba(99, 102, 241, 0.12)"
                      stroke="#6366f1"
                      strokeWidth={2}
                      cornerRadius={3}
                    />
                    {/* Label badge */}
                    <Rect
                      x={rect.x}
                      y={rect.y - 24}
                      width={Math.max(44, (q.label.length + (q.questionCrops.length > 1 ? 8 : 0)) * 10 + 20)}
                      height={24}
                      fill="#6366f1"
                      cornerRadius={[6, 6, 0, 0]}
                    />
                    <Text
                      x={rect.x + 8}
                      y={rect.y - 19}
                      text={q.questionCrops.length > 1 ? `${q.label} (pt ${idx + 1})` : q.label}
                      fontSize={12}
                      fontFamily="Inter, sans-serif"
                      fontStyle="600"
                      fill="white"
                    />
                  </Group>
                );
              })}
            </Group>
          ))}

          {/* ── Pending multi-part selections on this page ── */}
          {pendingQuestionCrops.map((crop, idx) => {
            if ((crop.pageNumber ?? pageIndex) !== pageIndex) return null;
            const rect = normalizedRectToStage(crop, width, height);
            return (
              <Group key={`pending-${idx}`}>
                <Rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="rgba(245, 158, 11, 0.12)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dash={[6, 4]}
                  cornerRadius={3}
                />
                <Rect
                  x={rect.x}
                  y={rect.y - 24}
                  width={80}
                  height={24}
                  fill="#f59e0b"
                  cornerRadius={[6, 6, 0, 0]}
                />
                <Text
                  x={rect.x + 8}
                  y={rect.y - 19}
                  text={`Part ${idx + 1}`}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontStyle="600"
                  fill="white"
                />
              </Group>
            );
          })}

          {/* ── Pending multi-part answers on this page ── */}
          {pendingAnswerCrops.map((crop, idx) => {
            if ((crop.pageNumber ?? pageIndex) !== pageIndex) return null;
            const rect = normalizedRectToStage(crop, width, height);
            return (
              <Group key={`pending-ans-${idx}`}>
                <Rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="rgba(34, 197, 94, 0.12)"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dash={[6, 4]}
                  cornerRadius={3}
                />
                <Rect
                  x={rect.x}
                  y={rect.y - 24}
                  width={100}
                  height={24}
                  fill="#22c55e"
                  cornerRadius={[6, 6, 0, 0]}
                />
                <Text
                  x={rect.x + 8}
                  y={rect.y - 19}
                  text={`Ans Part ${idx + 1}`}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontStyle="600"
                  fill="white"
                />
              </Group>
            );
          })}

          {/* ── Answers on this page ── */}
          {pageAnswers.map((q) => (
            <Group key={`ans-${q.id}`}>
              {q.answerCrops!.map((crop, idx) => {
                if ((crop.pageNumber ?? q.pageNumber) !== pageIndex) return null;
                const ansRect = normalizedRectToStage(crop, width, height);
                return (
                  <Group key={`ans-${q.id}-part-${idx}`}>
                    <Rect
                      x={ansRect.x}
                      y={ansRect.y}
                      width={ansRect.width}
                      height={ansRect.height}
                      fill="rgba(34, 197, 94, 0.10)"
                      stroke="#22c55e"
                      strokeWidth={2}
                      cornerRadius={3}
                      dash={[6, 4]}
                    />
                    <Rect
                      x={ansRect.x}
                      y={ansRect.y - 22}
                      width={Math.max(64, (q.label.length + (q.answerCrops!.length > 1 ? 8 : 0)) * 10 + 30)}
                      height={22}
                      fill="#22c55e"
                      cornerRadius={[6, 6, 0, 0]}
                    />
                    <Text
                      x={ansRect.x + 6}
                      y={ansRect.y - 18}
                      text={q.answerCrops!.length > 1 ? `${q.label} Ans (pt ${idx + 1})` : `${q.label} Ans`}
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      fontStyle="600"
                      fill="white"
                    />
                  </Group>
                );
              })}
            </Group>
          ))}

          {/* ── Currently drawing rect (phase: drawing) ── */}
          {drawingRect && phase === 'drawing' && (
            <Rect
              x={drawingRect.x}
              y={drawingRect.y}
              width={drawingRect.width}
              height={drawingRect.height}
              fill={isAnswerMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.18)'}
              stroke={isAnswerMode ? '#22c55e' : '#818cf8'}
              strokeWidth={2}
              dash={[8, 4]}
              cornerRadius={3}
            />
          )}

          {/* ── Adjustable rect (phase: adjusting) ── */}
          {pendingRect && phase === 'adjusting' && (
            <>
              <Rect
                ref={pendingRectRef}
                x={pendingRect.x}
                y={pendingRect.y}
                width={pendingRect.width}
                height={pendingRect.height}
                fill={isAnswerMode ? 'rgba(34, 197, 94, 0.18)' : 'rgba(99, 102, 241, 0.22)'}
                stroke={isAnswerMode ? '#22c55e' : '#818cf8'}
                strokeWidth={2.5}
                cornerRadius={3}
                draggable
                onDragEnd={() => {
                  // Force re-render for button position
                  setPendingRect((prev) => prev ? { ...prev } : null);
                }}
                onTransformEnd={() => {
                  setPendingRect((prev) => prev ? { ...prev } : null);
                }}
              />
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                borderStroke={isAnswerMode ? '#22c55e' : '#818cf8'}
                borderStrokeWidth={2}
                anchorStroke={isAnswerMode ? '#22c55e' : '#6366f1'}
                anchorFill="white"
                anchorSize={12}
                anchorCornerRadius={3}
                keepRatio={false}
                boundBoxFunc={(_, newBox) => {
                  // Clamp to stage bounds
                  const box = { ...newBox };
                  box.x = Math.max(0, box.x);
                  box.y = Math.max(0, box.y);
                  if (box.x + box.width > width) box.width = width - box.x;
                  if (box.y + box.height > height) box.height = height - box.y;
                  box.width = Math.max(20, box.width);
                  box.height = Math.max(20, box.height);
                  return box;
                }}
              />
            </>
          )}
        </Layer>
      </Stage>

      {/* ── Floating Confirm/Cancel buttons (HTML overlay, not Konva) ── */}
      {phase === 'adjusting' && pendingRect && (
        <div
          className="absolute z-30 flex items-center gap-1.5 animate-fade-in"
          style={{
            left: Math.min(Math.max(8, btnPos.x - 80), width - 240),
            top: Math.min(Math.max(8, btnPos.y), height - 48),
          }}
        >
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg
              bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold
              shadow-lg shadow-brand-500/30 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {isAnswerMode ? 'Add Ans' : 'Confirm'}
          </button>
          <button
            onClick={handleAddPart}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg
              bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold
              shadow-lg shadow-amber-500/30 transition-all active:scale-95"
            title="Add another part to this question (e.g. on next page)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Part
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center justify-center w-8 h-8 rounded-lg
              bg-surface-800 hover:bg-surface-700 text-surface-300
              border border-surface-600 shadow-lg transition-all active:scale-95"
            title="Cancel (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
