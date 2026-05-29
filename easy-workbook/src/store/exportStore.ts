import { create } from 'zustand';
import type { ExportSettings, ExportType, NoteStyle, ThemeName } from '@/types';

interface ExportState extends ExportSettings {
  /** Whether preview mode is active */
  previewMode: boolean;

  // Actions
  setExportType: (type: ExportType) => void;
  setQuestionsPerPage: (count: 1 | 2 | 3) => void;
  setNoteStyle: (style: NoteStyle) => void;
  setTheme: (theme: ThemeName) => void;
  setMargins: (margins: Partial<ExportSettings['margins']>) => void;
  setSpacing: (spacing: number) => void;
  setLineSpacing: (spacing: number) => void;
  setNoteStyleOpacity: (opacity: number) => void;
  setGridSize: (size: number) => void;
  setDotDensity: (density: number) => void;
  setQuestionImageScale: (scale: number) => void;
  setAnswerImageScale: (scale: number) => void;
  setAnswerPosition: (position: 'left' | 'center' | 'right') => void;
  setPreviewMode: (preview: boolean) => void;
  setPdfTitle: (title: string) => void;
  setCustomPageColor: (color: string) => void;
  resetDefaults: () => void;
  getSettings: () => ExportSettings;
}

const DEFAULT_SETTINGS: ExportSettings = {
  exportType: 'practice',
  questionsPerPage: 1,
  noteStyle: 'lined',
  theme: 'minimal',
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
  spacing: 20,
  lineSpacing: 24,
  noteStyleOpacity: 0.15,
  gridSize: 20,
  dotDensity: 20,
  questionImageScale: 1.0,
  answerImageScale: 1.0,
  answerPosition: 'left',
  pdfTitle: 'Easy Workbook',
  customPageColor: '',
};

export const useExportStore = create<ExportState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  previewMode: false,

  setExportType: (exportType) => set({ exportType }),
  setQuestionsPerPage: (questionsPerPage) => set({ questionsPerPage }),
  setNoteStyle: (noteStyle) => set({ noteStyle }),
  setTheme: (theme) => set({ theme }),
  setMargins: (margins) => set((state) => ({
    margins: { ...state.margins, ...margins },
  })),
  setSpacing: (spacing) => set({ spacing }),
  setLineSpacing: (lineSpacing) => set({ lineSpacing }),
  setNoteStyleOpacity: (noteStyleOpacity) => set({ noteStyleOpacity }),
  setGridSize: (gridSize) => set({ gridSize }),
  setDotDensity: (dotDensity) => set({ dotDensity }),
  setQuestionImageScale: (questionImageScale) => set({ questionImageScale }),
  setAnswerImageScale: (answerImageScale) => set({ answerImageScale }),
  setAnswerPosition: (answerPosition) => set({ answerPosition }),
  setPdfTitle: (pdfTitle) => set({ pdfTitle }),
  setCustomPageColor: (customPageColor) => set({ customPageColor }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  
  resetDefaults: () => set({ ...DEFAULT_SETTINGS }),
  
  getSettings: () => {
    const state = get();
    return {
      exportType: state.exportType,
      questionsPerPage: state.questionsPerPage,
      noteStyle: state.noteStyle,
      theme: state.theme,
      margins: state.margins,
      spacing: state.spacing,
      lineSpacing: state.lineSpacing,
      noteStyleOpacity: state.noteStyleOpacity,
      gridSize: state.gridSize,
      dotDensity: state.dotDensity,
      questionImageScale: state.questionImageScale,
      answerImageScale: state.answerImageScale,
      answerPosition: state.answerPosition,
      pdfTitle: state.pdfTitle,
      customPageColor: state.customPageColor,
    };
  },
}));
