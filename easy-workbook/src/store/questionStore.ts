import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Question, CropRegion } from "@/types";

interface QuestionState {
  questions: Question[];
  activeQuestionId: string | null;
  nextLabel: number; // counter for Q1, Q2, ...

  // Actions
  addQuestion: (params: {
    sourcePdfName: string;
    pageNumber: number;
    questionCrop: CropRegion;
    answerCrop?: CropRegion;
    thumbnail?: string;
  }) => string; // returns new question ID
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (fromIndex: number, toIndex: number) => void;
  toggleInclude: (id: string) => void;
  setActiveQuestion: (id: string | null) => void;
  setAnswerCrop: (id: string, crop: CropRegion) => void;
  removeAnswerCrop: (id: string) => void;
  clearAll: () => void;
  getIncludedQuestions: () => Question[];
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  activeQuestionId: null,
  nextLabel: 1,

  addQuestion: (params) => {
    const id = uuidv4();
    const label = `Q${get().nextLabel}`;
    const question: Question = {
      id,
      sourcePdfName: params.sourcePdfName,
      pageNumber: params.pageNumber,
      questionCrop: params.questionCrop,
      answerCrop: params.answerCrop,
      label,
      rotation: 0,
      includedInExport: true,
      noteStyle: "lined",
      tags: [],
      createdAt: Date.now(),
      thumbnail: params.thumbnail,
    };
    set((state) => ({
      questions: [...state.questions, question],
      nextLabel: state.nextLabel + 1,
    }));
    return id;
  },

  removeQuestion: (id) =>
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== id),
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
    const label = `Q${get().nextLabel}`;
    const duplicate: Question = {
      ...original,
      id: newId,
      label,
      createdAt: Date.now(),
    };
    set((state) => {
      const idx = state.questions.findIndex((q) => q.id === id);
      const newQuestions = [...state.questions];
      newQuestions.splice(idx + 1, 0, duplicate);
      return { questions: newQuestions, nextLabel: state.nextLabel + 1 };
    });
  },

  reorderQuestions: (fromIndex, toIndex) =>
    set((state) => {
      const newQuestions = [...state.questions];
      const [moved] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, moved);
      return { questions: newQuestions };
    }),

  toggleInclude: (id) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, includedInExport: !q.includedInExport } : q,
      ),
    })),

  setActiveQuestion: (id) => set({ activeQuestionId: id }),

  setAnswerCrop: (id, crop) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, answerCrop: crop } : q,
      ),
    })),

  removeAnswerCrop: (id) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, answerCrop: undefined } : q,
      ),
    })),

  clearAll: () => set({ questions: [], activeQuestionId: null, nextLabel: 1 }),

  getIncludedQuestions: () => get().questions.filter((q) => q.includedInExport),
}));
