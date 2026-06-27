import { create } from 'zustand';
import type { DetectedQuestion, DetectionProgress } from '@/types';

interface DetectionState {
  /** Detected questions from auto-detection */
  detectedQuestions: DetectedQuestion[];
  /** Whether detection is in progress */
  isDetecting: boolean;
  /** Detection progress info */
  detectionProgress: DetectionProgress;
  /** Error during detection */
  detectionError: string | null;
  /** Set of page indices that have been processed */
  processedPages: Set<number>;
  /** Whether OCR was needed for any page */
  usedOcr: boolean;
  /** Whether detection results exist (even if empty) */
  hasResults: boolean;

  // Actions
  startDetection: () => void;
  setProgress: (progress: DetectionProgress) => void;
  setDetectedQuestions: (questions: DetectedQuestion[]) => void;
  addProcessedPage: (pageIndex: number) => void;
  removeDetected: (id: string) => void;
  clearDetection: () => void;
  setError: (error: string | null) => void;
  setUsedOcr: (used: boolean) => void;
  finishDetection: () => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
  detectedQuestions: [],
  isDetecting: false,
  detectionProgress: { current: 0, total: 0, phase: '' },
  detectionError: null,
  processedPages: new Set(),
  usedOcr: false,
  hasResults: false,

  startDetection: () => set({
    isDetecting: true,
    detectionError: null,
    detectedQuestions: [],
    processedPages: new Set(),
    usedOcr: false,
    hasResults: false,
    detectionProgress: { current: 0, total: 0, phase: 'Initializing...' },
  }),

  setProgress: (progress) => set({ detectionProgress: progress }),

  setDetectedQuestions: (questions) => set({
    detectedQuestions: questions,
    hasResults: true,
  }),

  addProcessedPage: (pageIndex) => set((state) => {
    const newSet = new Set(state.processedPages);
    newSet.add(pageIndex);
    return { processedPages: newSet };
  }),

  removeDetected: (id) => set((state) => ({
    detectedQuestions: state.detectedQuestions.filter((q) => q.id !== id),
  })),

  clearDetection: () => set({
    detectedQuestions: [],
    isDetecting: false,
    detectionProgress: { current: 0, total: 0, phase: '' },
    detectionError: null,
    processedPages: new Set(),
    usedOcr: false,
    hasResults: false,
  }),

  setError: (error) => set({ detectionError: error, isDetecting: false }),

  setUsedOcr: (used) => set({ usedOcr: used }),

  finishDetection: () => set({ isDetecting: false }),
}));
