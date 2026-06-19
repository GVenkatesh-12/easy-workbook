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
  setInvertCropColors: (invert: boolean) => void;
  setRemoveBackground: (remove: boolean) => void;
  
  // Cover Page configuration
  setIncludeCoverPage: (includeCoverPage: boolean) => void;
  setCoverPageTitle: (coverPageTitle: string) => void;
  setCoverPageSubtitle: (coverPageSubtitle: string) => void;
  setCoverPageSubject: (coverPageSubject: string) => void;
  setCoverPageAuthor: (coverPageAuthor: string) => void;
  setCoverPageTheme: (coverPageTheme: ExportSettings['coverPageTheme']) => void;

  // Watermark configuration
  setWatermarkText: (watermarkText: string) => void;
  setWatermarkOpacity: (watermarkOpacity: number) => void;
  setWatermarkSize: (watermarkSize: number) => void;

  // Header/Footer customization
  setHeaderLeft: (headerLeft: string) => void;
  setHeaderRight: (headerRight: ExportSettings['headerRight']) => void;
  setHeaderRightCustom: (headerRightCustom: string) => void;
  setFooterLeft: (footerLeft: string) => void;
  setFooterRight: (footerRight: ExportSettings['footerRight']) => void;
  setFooterRightCustom: (footerRightCustom: string) => void;
  setShowHeaderLine: (showHeaderLine: boolean) => void;
  setShowFooterLine: (showFooterLine: boolean) => void;

  // Typography
  setFontFamily: (fontFamily: ExportSettings['fontFamily']) => void;
  
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
  questionImageScale: 0.5,
  answerImageScale: 0.5,
  answerPosition: 'left',
  pdfTitle: 'Easy Workbook',
  customPageColor: '',
  invertCropColors: false,
  removeBackground: false,

  // Cover Page configuration
  includeCoverPage: false,
  coverPageTitle: '',
  coverPageSubtitle: '',
  coverPageSubject: '',
  coverPageAuthor: '',
  coverPageTheme: 'minimal',

  // Watermark configuration
  watermarkText: '',
  watermarkOpacity: 0.1,
  watermarkSize: 50,

  // Header/Footer customization
  headerLeft: '',
  headerRight: 'page',
  headerRightCustom: '',
  footerLeft: '',
  footerRight: 'none',
  footerRightCustom: '',
  showHeaderLine: true,
  showFooterLine: false,

  // Typography
  fontFamily: 'helvetica',
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
  setInvertCropColors: (invertCropColors) => set({ invertCropColors }),
  setRemoveBackground: (removeBackground) => set({ removeBackground }),
  setPreviewMode: (previewMode) => set({ previewMode }),

  // Cover Page configuration
  setIncludeCoverPage: (includeCoverPage) => set({ includeCoverPage }),
  setCoverPageTitle: (coverPageTitle) => set({ coverPageTitle }),
  setCoverPageSubtitle: (coverPageSubtitle) => set({ coverPageSubtitle }),
  setCoverPageSubject: (coverPageSubject) => set({ coverPageSubject }),
  setCoverPageAuthor: (coverPageAuthor) => set({ coverPageAuthor }),
  setCoverPageTheme: (coverPageTheme) => set({ coverPageTheme }),

  // Watermark configuration
  setWatermarkText: (watermarkText) => set({ watermarkText }),
  setWatermarkOpacity: (watermarkOpacity) => set({ watermarkOpacity }),
  setWatermarkSize: (watermarkSize) => set({ watermarkSize }),

  // Header/Footer customization
  setHeaderLeft: (headerLeft) => set({ headerLeft }),
  setHeaderRight: (headerRight) => set({ headerRight }),
  setHeaderRightCustom: (headerRightCustom) => set({ headerRightCustom }),
  setFooterLeft: (footerLeft) => set({ footerLeft }),
  setFooterRight: (footerRight) => set({ footerRight }),
  setFooterRightCustom: (footerRightCustom) => set({ footerRightCustom }),
  setShowHeaderLine: (showHeaderLine) => set({ showHeaderLine }),
  setShowFooterLine: (showFooterLine) => set({ showFooterLine }),

  // Typography
  setFontFamily: (fontFamily) => set({ fontFamily }),
  
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
      invertCropColors: state.invertCropColors,
      removeBackground: state.removeBackground,

      // Cover Page configuration
      includeCoverPage: state.includeCoverPage,
      coverPageTitle: state.coverPageTitle,
      coverPageSubtitle: state.coverPageSubtitle,
      coverPageSubject: state.coverPageSubject,
      coverPageAuthor: state.coverPageAuthor,
      coverPageTheme: state.coverPageTheme,

      // Watermark configuration
      watermarkText: state.watermarkText,
      watermarkOpacity: state.watermarkOpacity,
      watermarkSize: state.watermarkSize,

      // Header/Footer customization
      headerLeft: state.headerLeft,
      headerRight: state.headerRight,
      headerRightCustom: state.headerRightCustom,
      footerLeft: state.footerLeft,
      footerRight: state.footerRight,
      footerRightCustom: state.footerRightCustom,
      showHeaderLine: state.showHeaderLine,
      showFooterLine: state.showFooterLine,

      // Typography
      fontFamily: state.fontFamily,
    };
  },
}));
