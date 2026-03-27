import { createBlockClipboardActions } from './clipboard';
import { createBlockEditingActions } from './editing';
import { createBlockHistoryActions } from './history';
import type { BlockUseCaseDeps } from './types';

export function createBlockUseCases({
  backend,
  clipboard,
  editorPersistence,
  flushCurrentDocument,
  history,
  session,
  workspace,
}: BlockUseCaseDeps) {
  const editing = createBlockEditingActions({
    backend,
    editorPersistence,
    flushCurrentDocument,
    history,
    session,
    workspace,
  });
  const clipboardActions = createBlockClipboardActions({
    backend,
    clipboard,
    editorPersistence,
    flushCurrentDocument,
    history,
    session,
    workspace,
  }, {
    clearBlockContent: editing.clearBlockContent,
  });
  const historyActions = createBlockHistoryActions({
    backend,
    editorPersistence,
    history,
    session,
    workspace,
  });

  return {
    createBlockBelow: editing.createBlockBelow,
    changeBlockKind: editing.changeBlockKind,
    moveBlock: editing.moveBlock,
    deleteBlock: editing.deleteBlock,
    updateMarkdownBlock: editing.updateMarkdownBlock,
    updateCodeBlock: editing.updateCodeBlock,
    updateTextBlock: editing.updateTextBlock,
    isBlockClipboardText: clipboardActions.isBlockClipboardText,
    copySelectedBlocks: clipboardActions.copySelectedBlocks,
    copySingleBlock: clipboardActions.copySingleBlock,
    pasteBlocks: clipboardActions.pasteBlocks,
    deleteSelectedBlocks: clipboardActions.deleteSelectedBlocks,
    undoBlockOperation: historyActions.undoBlockOperation,
    redoBlockOperation: historyActions.redoBlockOperation,
  };
}
