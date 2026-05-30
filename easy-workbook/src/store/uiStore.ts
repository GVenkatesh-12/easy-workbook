import { create } from 'zustand';
import type { InteractionMode, ActivePanel } from '@/types';

interface UiState {
  /** Current interaction mode */
  mode: InteractionMode;
  /** Whether the sidebar is open */
  sidebarOpen: boolean;
  /** Dark mode enabled */
  darkMode: boolean;
  /** Currently active panel in sidebar */
  activePanel: ActivePanel;
  /** Whether a modal is showing */
  modalOpen: string | null;
  /** Toast notification queue */
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  /** Whether the product tour is running */
  runTour: boolean;

  // Actions
  setRunTour: (run: boolean) => void;
  setMode: (mode: InteractionMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set) => ({
  mode: 'view',
  sidebarOpen: true,
  darkMode: true,
  activePanel: 'questions',
  modalOpen: null,
  toasts: [],
  runTour: false,

  setRunTour: (run) => set({ runTour: run }),
  setMode: (mode) => set({ mode }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  setActivePanel: (panel) => set({ activePanel: panel }),

  openModal: (modalId) => set({ modalOpen: modalId }),
  closeModal: () => set({ modalOpen: null }),

  addToast: (message, type = 'info') => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove after 3s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));
