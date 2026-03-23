import { create } from 'zustand';
import type { DocumentVm } from '../adapters/documentAdapter';

const MAX_HISTORY = 50;

interface BlockHistoryState {
  undoStack: DocumentVm[];
  redoStack: DocumentVm[];
  pushUndo: (document: DocumentVm) => void;
  popUndo: () => DocumentVm | null;
  pushRedo: (document: DocumentVm) => void;
  popRedo: () => DocumentVm | null;
  clear: () => void;
}

export const useBlockHistoryStore = create<BlockHistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  pushUndo: (document) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-(MAX_HISTORY - 1)), document],
      redoStack: [],
    })),
  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    const last = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1) });
    return last;
  },
  pushRedo: (document) =>
    set((state) => ({
      redoStack: [...state.redoStack.slice(-(MAX_HISTORY - 1)), document],
    })),
  popRedo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const last = redoStack[redoStack.length - 1];
    set({ redoStack: redoStack.slice(0, -1) });
    return last;
  },
  clear: () => set({ undoStack: [], redoStack: [] }),
}));
