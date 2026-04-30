import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UiState {
  isSettingsOpen: boolean;
  desktopSidebarExpanded: boolean;
  mobileSidebarOpen: boolean;
  isTrashExpanded: boolean;
  trashNotice: {
    id: string;
    documentId: string;
    title: string;
  } | null;
  setSettingsOpen: (isOpen: boolean) => void;
  setDesktopSidebarExpanded: (isExpanded: boolean) => void;
  setMobileSidebarOpen: (isOpen: boolean) => void;
  setTrashExpanded: (isExpanded: boolean) => void;
  toggleTrashExpanded: () => void;
  showTrashNotice: (documentId: string, title: string) => void;
  clearTrashNotice: (noticeId?: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSettingsOpen: false,
      desktopSidebarExpanded: true,
      mobileSidebarOpen: false,
      isTrashExpanded: false,
      trashNotice: null,
      setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      setDesktopSidebarExpanded: (desktopSidebarExpanded) => set({ desktopSidebarExpanded }),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      setTrashExpanded: (isTrashExpanded) => set({ isTrashExpanded }),
      toggleTrashExpanded: () => set((state) => ({ isTrashExpanded: !state.isTrashExpanded })),
      showTrashNotice: (documentId, title) =>
        set({
          trashNotice: {
            id: `${documentId}:${Date.now()}`,
            documentId,
            title,
          },
        }),
      clearTrashNotice: (noticeId) =>
        set((state) => {
          if (noticeId && state.trashNotice?.id !== noticeId) {
            return {};
          }
          return { trashNotice: null };
        }),
    }),
    {
      name: 'workspace-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        desktopSidebarExpanded: state.desktopSidebarExpanded,
      }),
    },
  ),
);
