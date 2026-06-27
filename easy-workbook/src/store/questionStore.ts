import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Question, CropRegion } from "@/types";

interface QuestionState {
  questions: Question[];
  activeQuestionId: string | null;

  pendingQuestionCrops: CropRegion[];
  pendingAnswerCrops: CropRegion[];

  // Actions
  addQuestion: (params: {
    sourcePdfName: string;
    pageNumber: number;
    questionCrops: CropRegion[];
    answerCrops?: CropRegion[];
    thumbnail?: string;
    sourceDetectionId?: string;
  }) => string; // returns new question ID
  addPendingCrop: (crop: CropRegion) => void;
  clearPendingCrops: () => void;
  addPendingAnswerCrop: (crop: CropRegion) => void;
  clearPendingAnswerCrops: () => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (fromIndex: number, toIndex: number) => void;
  toggleInclude: (id: string) => void;
  setActiveQuestion: (id: string | null) => void;
  setAnswerCrops: (id: string, crops: CropRegion[], thumbnail?: string) => void;
  removeAnswerCrops: (id: string) => void;
  setQuestionSpaceWeight: (id: string, weight: number) => void;
  clearAll: () => void;
  getIncludedQuestions: () => Question[];
}

const reindexLabels = (questions: Question[]): Question[] => {
  return questions.map((q, idx) => ({ ...q, label: `Q${idx + 1}` }));
};

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  pendingQuestionCrops: [],
  pendingAnswerCrops: [],
  activeQuestionId: null,

  addPendingCrop: (crop) => set((state) => ({ pendingQuestionCrops: [...state.pendingQuestionCrops, crop] })),
  clearPendingCrops: () => set({ pendingQuestionCrops: [] }),
  addPendingAnswerCrop: (crop) => set((state) => ({ pendingAnswerCrops: [...state.pendingAnswerCrops, crop] })),
  clearPendingAnswerCrops: () => set({ pendingAnswerCrops: [] }),

  addQuestion: (params) => {
    const id = uuidv4();
    const question: Question = {
      id,
      sourcePdfName: params.sourcePdfName,
      pageNumber: params.pageNumber,
      questionCrops: params.questionCrops,
      answerCrops: params.answerCrops,
      label: "", // Will be set by reindexLabels
      rotation: 0,
      includedInExport: true,
      noteStyle: "lined",
      tags: [],
      createdAt: Date.now(),
      thumbnail: params.thumbnail,
      spaceWeight: 1, // Default weight
      sourceDetectionId: params.sourceDetectionId,
    };
    set((state) => ({
      questions: reindexLabels([...state.questions, question]),
    }));
    return id;
  },

  removeQuestion: (id) =>
    set((state) => ({
      questions: reindexLabels(state.questions.filter((q) => q.id !== id)),
      activeQuestionId:
        state.activeQuestionId === id ? null : state.activeQuestionId,
    })),

  updateQuestion: (id, updates) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q,
      ),
    })),

  duplicateQuestion: (id) => {
    const original = get().questions.find((q) => q.id === id);
    if (!original) return;
    const newId = uuidv4();
    const duplicate: Question = {
      ...original,
      id: newId,
      createdAt: Date.now(),
    };
    set((state) => {
      const idx = state.questions.findIndex((q) => q.id === id);
      const newQuestions = [...state.questions];
      newQuestions.splice(idx + 1, 0, duplicate);
      return { questions: reindexLabels(newQuestions) };
    });
  },

  reorderQuestions: (fromIndex, toIndex) =>
    set((state) => {
      const newQuestions = [...state.questions];
      const [moved] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, moved);
      return { questions: reindexLabels(newQuestions) };
    }),

  toggleInclude: (id) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, includedInExport: !q.includedInExport } : q,
      ),
    })),

  setActiveQuestion: (id) => set({ activeQuestionId: id }),

  setAnswerCrops: (id, crops, thumbnail) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, answerCrops: crops, answerThumbnail: thumbnail } : q,
      ),
    })),

  removeAnswerCrops: (id) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, answerCrops: undefined } : q,
      ),
    })),

  setQuestionSpaceWeight: (id, weight) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, spaceWeight: weight } : q,
      ),
    })),

  clearAll: () => set({ questions: [], activeQuestionId: null, pendingQuestionCrops: [], pendingAnswerCrops: [] }),

  getIncludedQuestions: () => get().questions.filter((q) => q.includedInExport),
}));
