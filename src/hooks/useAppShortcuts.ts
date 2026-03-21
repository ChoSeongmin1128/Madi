import { useEffect, useRef } from 'react';
import {
  copySelectedBlocks,
  deleteBlock,
  deleteSelectedBlocks,
  flushCurrentDocument,
} from '../controllers/appController';
import { useDocumentSessionStore } from '../stores/documentSessionStore';

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, [contenteditable="true"], [contenteditable=""], .cm-editor, .cm-content, .ProseMirror',
    ),
  );
}

export function useAppShortcuts() {
  const currentDocument = useDocumentSessionStore((state) => state.currentDocument);
  const allBlocksSelected = useDocumentSessionStore((state) => state.allBlocksSelected);
  const selectedBlockId = useDocumentSessionStore((state) => state.selectedBlockId);
  const setAllBlocksSelected = useDocumentSessionStore((state) => state.setAllBlocksSelected);

  const lastSelectAllRef = useRef(0);
  const lastBlockRef = useRef<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentDocument) {
        return;
      }

      if ((event.key === 'Backspace' || event.key === 'Delete') && allBlocksSelected && !isEditableTarget(event.target)) {
        event.preventDefault();
        void deleteSelectedBlocks();
        return;
      }

      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedBlockId && !isEditableTarget(event.target)) {
        event.preventDefault();
        void deleteBlock(selectedBlockId);
        return;
      }

      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta) {
        return;
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void flushCurrentDocument();
        return;
      }

      if (event.key.toLowerCase() === 'a') {
        const now = Date.now();
        const isSecondSelection =
          lastBlockRef.current === selectedBlockId &&
          now - lastSelectAllRef.current < 700;

        lastSelectAllRef.current = now;
        lastBlockRef.current = selectedBlockId;

        if (isSecondSelection) {
          event.preventDefault();
          setAllBlocksSelected(true);
        }

        return;
      }

      if (event.key.toLowerCase() === 'c' && allBlocksSelected) {
        event.preventDefault();
        void copySelectedBlocks();
      }
    };

    const onBeforeUnload = () => {
      void flushCurrentDocument();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [allBlocksSelected, currentDocument, selectedBlockId, setAllBlocksSelected]);
}
