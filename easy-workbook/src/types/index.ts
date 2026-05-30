export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  pageNumber?: number; // 0-indexed page where this crop was taken
}

/** Note style for the solving space */
export type NoteStyle = 'blank' | 'lined' | 'dotted' | 'grid';

/** A single selected question */
export interface Question {
  id: string;
  sourcePdfName: string;
  pageNumber: number; // 0-indexed
  questionCrops: CropRegion[];
  answerCrops?: CropRegion[];
  answerThumbnail?: string; // data URL for answer preview
  label: string; // "Q1", "Q2", etc.
  rotation: number;
  includedInExport: boolean;
  noteStyle: NoteStyle;
  tags: string[];
  createdAt: number;
  thumbnail?: string; // data URL for sidebar preview
  spaceWeight?: number; // relative weight for spacing on a page (default 1)
}

/** Built-in theme names */
export type ThemeName = 'minimal' | 'blueprint' | 'dark-academia' | 'pastel' | 'exam-style' | 'monochrome' | 'ocean' | 'forest' | 'sunset' | 'terminal';

/** Export type variants */
export type ExportType = 'practice' | 'answer-key' | 'combined';

/** Full export configuration */
export interface ExportSettings {
  exportType: ExportType;
  questionsPerPage: 1 | 2 | 3;
  noteStyle: NoteStyle;
  theme: ThemeName;
  margins: { top: number; right: number; bottom: number; left: number };
  spacing: number;
  lineSpacing: number;
  noteStyleOpacity: number;
  gridSize: number;
  dotDensity: number;
  questionImageScale: number; // 0.1 to 1.0 scaling factor for question images
  answerImageScale: number; // 0.1 to 1.0 scaling factor for answer images
  answerPosition: 'left' | 'center' | 'right'; // Horizontal alignment of answers
  pdfTitle: string; // Custom title for the PDF header
  customPageColor: string; // Hex color for custom background, or empty string to use theme
}

/** Theme color palette */
export interface ThemeColors {
  name: ThemeName;
  label: string;
  background: string;
  surface: string;
  border: string;
  headerText: string;
  bodyText: string;
  accent: string;
  lineColor: string;
  questionBg: string;
}

/** App interaction mode */
export type InteractionMode = 'view' | 'select' | 'answer-select';

/** Selection state machine */
export type SelectionState = 'idle' | 'drawing' | 'adjusting' | 'confirmed';

/** UI active panel */
export type ActivePanel = 'questions' | 'export' | null;

/** Page info for the virtual scroller */
export interface PageInfo {
  index: number;
  width: number;
  height: number;
  top: number; // cumulative top offset
}
