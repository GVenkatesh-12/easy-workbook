import type { ThemeColors, ThemeName } from '@/types';

export const THEMES: Record<ThemeName, ThemeColors> = {
  minimal: {
    name: 'minimal',
    label: 'Minimal',
    background: '#ffffff',
    surface: '#fafafa',
    border: '#e5e7eb',
    headerText: '#111827',
    bodyText: '#374151',
    accent: '#6366f1',
    lineColor: '#d1d5db',
    questionBg: '#f9fafb',
  },
  blueprint: {
    name: 'blueprint',
    label: 'Blueprint',
    background: '#1e3a5f',
    surface: '#1a3352',
    border: '#2d5a8a',
    headerText: '#e0f0ff',
    bodyText: '#b8d4e8',
    accent: '#4a9eff',
    lineColor: '#2d5a8a',
    questionBg: '#1a3352',
  },
  'dark-academia': {
    name: 'dark-academia',
    label: 'Dark Academia',
    background: '#f5f0e8',
    surface: '#ebe5d8',
    border: '#c4b89a',
    headerText: '#3d2e1e',
    bodyText: '#5a4a36',
    accent: '#8b5e3c',
    lineColor: '#d4c8b0',
    questionBg: '#f0ead9',
  },
  pastel: {
    name: 'pastel',
    label: 'Pastel',
    background: '#fef7ff',
    surface: '#fdf2f8',
    border: '#f0abfc',
    headerText: '#701a75',
    bodyText: '#86198f',
    accent: '#d946ef',
    lineColor: '#f5d0fe',
    questionBg: '#fdf4ff',
  },
  'exam-style': {
    name: 'exam-style',
    label: 'Exam Style',
    background: '#ffffff',
    surface: '#ffffff',
    border: '#000000',
    headerText: '#000000',
    bodyText: '#000000',
    accent: '#000000',
    lineColor: '#cccccc',
    questionBg: '#ffffff',
  },
};

export function getTheme(name: ThemeName): ThemeColors {
  return THEMES[name];
}

export function getAllThemes(): ThemeColors[] {
  return Object.values(THEMES);
}
