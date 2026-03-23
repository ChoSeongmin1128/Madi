import {
  reorderDocumentBlocks,
  replaceBlockInDocument,
  toBlockVm,
  type BlockVm,
} from '../adapters/documentAdapter';
import { desktopApi } from '../lib/desktopApi';
import type { CodeLanguageId } from '../lib/blockOptions';
import { createEmptyMarkdownContent, isMarkdownContentEmpty } from '../lib/markdown';
import type { BlockKind } from '../lib/types';
import { clearBlockSync, flushDocumentSaves, queueDocumentSave } from '../services/documentSync';
import {
  clearError,
  executeWithErrorHandling,
  findBlock,
  getCurrentDocument,
  reportError,
  setDocumentWithFocus,
  toDocumentVm,
  updateDocumentState,
} from '../services/documentStateService';
import {
  type ClipboardBlockData,
  isBlockClipboardText,
  parseBlockClipboardText,
  readBlocksFromClipboard,
  writeBlocksToClipboard,
} from '../services/clipboardService';
import { enqueueSyncMutation } from '../services/syncBoundary';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useBlockHistoryStore } from '../stores/blockHistoryStore';
import { flushCurrentDocument } from './documentController';

function findEditableBlock<K extends BlockKind>(
  blockId: string,
  kind: K,
): { documentId: string; block: Extract<BlockVm, { kind: K }> } | null {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) return null;

  const block = findBlock(currentDocument, blockId);
  if (!block || block.kind !== kind) return null;

  return { documentId: currentDocument.id, block: block as Extract<BlockVm, { kind: K }> };
}

function applyUpdatedBlock(block: BlockVm) {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) return;

  const nextDocument = {
    ...currentDocument,
    blocks: currentDocument.blocks
      .map((b) => (b.id === block.id ? block : b))
      .sort((a, b) => a.position - b.position),
  };
  updateDocumentState(nextDocument);
}

function queueAndApplyBlockUpdate(blockId: string, nextBlock: BlockVm, payload: Parameters<typeof queueDocumentSave>[2]) {
  queueDocumentSave(nextBlock.documentId, blockId, payload);
  applyUpdatedBlock(nextBlock);
}

function clearBlockSelectionState() {
  useDocumentSessionStore.setState({
    selectedBlockId: null,
    selectedBlockIds: [],
    blockSelected: false,
    allBlocksSelected: false,
    activeEditorRef: null,
  });
}

function getSelectedBlocks(document = getCurrentDocument()) {
  if (!document) {
    return [];
  }

  const session = useDocumentSessionStore.getState();
  if (session.allBlocksSelected) {
    return document.blocks;
  }

  if (session.selectedBlockIds.length > 0) {
    const selectedIds = new Set(session.selectedBlockIds);
    return document.blocks.filter((block) => selectedIds.has(block.id));
  }

  if (session.blockSelected && session.selectedBlockId) {
    const block = findBlock(document, session.selectedBlockId);
    return block ? [block] : [];
  }

  return [];
}

function getSelectionInsertAfterBlockId(document: NonNullable<ReturnType<typeof getCurrentDocument>>) {
  const session = useDocumentSessionStore.getState();
  if (session.allBlocksSelected) {
    return document.blocks.at(-1)?.id ?? null;
  }

  if (session.selectedBlockIds.length > 0) {
    return session.selectedBlockIds.at(-1) ?? document.blocks.at(-1)?.id ?? null;
  }

  return session.selectedBlockId ?? document.blocks.at(-1)?.id ?? null;
}

async function clearBlockContent(block: BlockVm) {
  if (block.kind === 'markdown') {
    await desktopApi.updateMarkdownBlock(block.id, createEmptyMarkdownContent());
    return;
  }

  if (block.kind === 'text') {
    await desktopApi.updateTextBlock(block.id, '');
    return;
  }

  await desktopApi.updateCodeBlock(block.id, '', block.language);
}

// --- Block CRUD ---

export async function createBlockBelow(afterBlockId: string | null, kind: BlockKind = 'markdown') {
  const snapshotDoc = getCurrentDocument();
  if (snapshotDoc) useBlockHistoryStore.getState().pushUndo(snapshotDoc);
  useDocumentSessionStore.getState().setActiveEditorRef(null);

  await executeWithErrorHandling(async () => {
    const currentDocument = getCurrentDocument();
    if (!currentDocument) return;

    await flushCurrentDocument();
    const nextDocument = toDocumentVm(
      await desktopApi.createBlockBelow(currentDocument.id, afterBlockId, kind),
    );

    const nextBlock =
      nextDocument.blocks.find((block) => {
        if (afterBlockId == null) return block.position === 0;
        const source = currentDocument.blocks.find((entry) => entry.id === afterBlockId);
        return source ? block.position === source.position + 1 : false;
      }) ?? nextDocument.blocks.at(-1) ?? null;

    setDocumentWithFocus(nextDocument, nextBlock?.id ?? null, 'start');
    if (nextBlock) {
      enqueueSyncMutation({ kind: 'block-created', documentId: nextDocument.id, blockId: nextBlock.id });
    }
  }, '블록을 만들지 못했습니다.');
}

export async function changeBlockKind(blockId: string, kind: BlockKind) {
  const snapshotDoc = getCurrentDocument();
  if (snapshotDoc) useBlockHistoryStore.getState().pushUndo(snapshotDoc);
  useDocumentSessionStore.getState().setActiveEditorRef(null);

  await executeWithErrorHandling(async () => {
    const currentDocument = getCurrentDocument();
    if (!currentDocument) return;

    const nextBlock = toBlockVm(await desktopApi.changeBlockKind(blockId, kind));
    const replaced = replaceBlockInDocument(currentDocument, nextBlock);
    clearBlockSync(currentDocument.id, blockId);
    updateDocumentState(replaced);
    enqueueSyncMutation({ kind: 'block-updated', documentId: currentDocument.id, blockId });
  }, '블록 형식을 바꾸지 못했습니다.');
}

export async function moveBlock(blockId: string, targetPosition: number) {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) return;
  useBlockHistoryStore.getState().pushUndo(currentDocument);
  useDocumentSessionStore.getState().setActiveEditorRef(null);

  const sourceIndex = currentDocument.blocks.findIndex((block) => block.id === blockId);
  if (sourceIndex < 0 || sourceIndex === targetPosition) return;

  const previousDocument = currentDocument;
  const optimisticDocument = reorderDocumentBlocks(currentDocument, blockId, targetPosition);
  clearError();
  setDocumentWithFocus(optimisticDocument, blockId, 'start');
  useDocumentSessionStore.getState().setIsFlushing(true);

  try {
    await flushDocumentSaves(previousDocument.id);
    const nextDocument = toDocumentVm(
      await desktopApi.moveBlock(previousDocument.id, blockId, targetPosition),
    );
    updateDocumentState(nextDocument);
    useDocumentSessionStore.getState().requestBlockFocus(blockId, 'start');
    enqueueSyncMutation({ kind: 'document-reordered-blocks', documentId: nextDocument.id });
  } catch (error) {
    setDocumentWithFocus(previousDocument, blockId, 'start');
    reportError(error, '블록 순서를 저장하지 못했습니다.');
  } finally {
    useDocumentSessionStore.getState().setIsFlushing(false);
  }
}

export async function deleteBlock(blockId: string) {

  const snapshotDoc = getCurrentDocument();
  if (snapshotDoc && snapshotDoc.blocks.length > 1) useBlockHistoryStore.getState().pushUndo(snapshotDoc);
  useDocumentSessionStore.getState().setActiveEditorRef(null);

  await executeWithErrorHandling(async () => {
    const currentDocument = getCurrentDocument();
    if (!currentDocument || currentDocument.blocks.length <= 1) return;

    const deletedIndex = currentDocument.blocks.findIndex((block) => block.id === blockId);
    const previousBlock = deletedIndex > 0 ? currentDocument.blocks[deletedIndex - 1] : null;
    const nextBlock = deletedIndex >= 0 ? currentDocument.blocks[deletedIndex + 1] ?? null : null;

    clearBlockSync(currentDocument.id, blockId);
    const nextDocument = toDocumentVm(await desktopApi.deleteBlock(blockId));
    updateDocumentState(nextDocument);
    enqueueSyncMutation({ kind: 'block-deleted', documentId: nextDocument.id, blockId });

    const focusTarget = previousBlock?.id ?? nextBlock?.id;
    if (focusTarget) {
      useDocumentSessionStore.getState().requestBlockFocus(focusTarget, previousBlock ? 'end' : 'start');
    }
  }, '블록을 삭제하지 못했습니다.');
}

// --- Block Content Updates ---

export function updateMarkdownBlock(blockId: string, content: string) {
  const editable = findEditableBlock(blockId, 'markdown');
  if (!editable) return;
  queueAndApplyBlockUpdate(blockId, { ...editable.block, content, updatedAt: Date.now() }, { kind: 'markdown', content });
}

export function updateCodeBlock(blockId: string, content: string, language: CodeLanguageId | null) {
  const editable = findEditableBlock(blockId, 'code');
  if (!editable) return;
  const nextLanguage = language ?? 'plaintext';
  queueAndApplyBlockUpdate(blockId, { ...editable.block, content, language: nextLanguage, updatedAt: Date.now() }, { kind: 'code', content, language: nextLanguage });
}

export function updateTextBlock(blockId: string, content: string) {
  const editable = findEditableBlock(blockId, 'text');
  if (!editable) return;
  queueAndApplyBlockUpdate(blockId, { ...editable.block, content, updatedAt: Date.now() }, { kind: 'text', content });
}

// --- Clipboard Operations ---

export { isBlockClipboardText };

export async function copySelectedBlocks() {
  const blocks = getSelectedBlocks();
  if (blocks.length === 0) {
    return;
  }

  await writeBlocksToClipboard(blocks.map((b) => ({
    kind: b.kind, content: b.content, language: b.kind === 'code' ? b.language : null,
  })));
}

export async function copySingleBlock(blockId: string) {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) return;
  const block = findBlock(currentDocument, blockId);
  if (!block) return;

  await writeBlocksToClipboard([{
    kind: block.kind, content: block.content, language: block.kind === 'code' ? block.language : null,
  }]);
}

async function writeBlockContent(blockId: string, data: ClipboardBlockData) {
  if (data.kind === 'markdown') await desktopApi.updateMarkdownBlock(blockId, data.content);
  else if (data.kind === 'text') await desktopApi.updateTextBlock(blockId, data.content);
  else if (data.kind === 'code') await desktopApi.updateCodeBlock(blockId, data.content, data.language ?? null);
}

export async function pasteBlocks(clipboardText?: string) {
  const snapshotDoc = getCurrentDocument();
  if (snapshotDoc) useBlockHistoryStore.getState().pushUndo(snapshotDoc);

  await executeWithErrorHandling(async () => {
    const currentDocument = getCurrentDocument();
    if (!currentDocument) return;

    const blocksToInsert = clipboardText != null
      ? parseBlockClipboardText(clipboardText)
      : await readBlocksFromClipboard();
    if (!blocksToInsert) return;

    const session = useDocumentSessionStore.getState();
    const selectedBlockId = session.selectedBlockId;
    const selectedBlock = selectedBlockId ? findBlock(currentDocument, selectedBlockId) : null;
    const hasSubsetSelection = session.selectedBlockIds.length > 0;
    const canOverwriteSelectedBlock = !session.allBlocksSelected && !hasSubsetSelection && session.blockSelected && selectedBlock != null;
    const isSelectedEmpty = selectedBlock
      ? (selectedBlock.kind === 'code' ? !selectedBlock.content.trim() : isMarkdownContentEmpty(selectedBlock.content))
      : false;

    await flushCurrentDocument();
    let afterBlockId = getSelectionInsertAfterBlockId(currentDocument);
    let firstNewBlockId: string | null = null;

    const firstData = blocksToInsert[0];
    if (canOverwriteSelectedBlock && isSelectedEmpty && selectedBlock && firstData) {
      if (firstData.kind !== selectedBlock.kind) await desktopApi.changeBlockKind(selectedBlock.id, firstData.kind);
      await writeBlockContent(selectedBlock.id, firstData);
      firstNewBlockId = selectedBlock.id;
      afterBlockId = selectedBlock.id;
    } else if (firstData) {
      const doc = toDocumentVm(await desktopApi.createBlockBelow(currentDocument.id, afterBlockId, firstData.kind));
      const created = doc.blocks.find((b) => !currentDocument.blocks.some((ob) => ob.id === b.id));
      if (created) {
        await writeBlockContent(created.id, firstData);
        firstNewBlockId = created.id;
        afterBlockId = created.id;
      }
      updateDocumentState(doc);
    }

    for (const data of blocksToInsert.slice(1)) {
      const latestDoc = getCurrentDocument();
      if (!latestDoc) break;
      const doc = toDocumentVm(await desktopApi.createBlockBelow(latestDoc.id, afterBlockId, data.kind));
      const created = doc.blocks.find((b) => !latestDoc.blocks.some((ob) => ob.id === b.id));
      if (created) {
        await writeBlockContent(created.id, data);
        firstNewBlockId = firstNewBlockId ?? created.id;
        afterBlockId = created.id;
      }
      updateDocumentState(doc);
    }

    const finalDoc = toDocumentVm(await desktopApi.openDocument(currentDocument.id));
    updateDocumentState(finalDoc);
    clearBlockSelectionState();
    if (firstNewBlockId) {
      useDocumentSessionStore.getState().requestBlockFocus(firstNewBlockId, 'start');
    }
  }, '블록을 붙여넣지 못했습니다.');
}

export async function deleteSelectedBlocks() {
  const currentDocument = getCurrentDocument();
  const selectedBlocks = getSelectedBlocks(currentDocument);
  if (!currentDocument || selectedBlocks.length === 0) return;
  useBlockHistoryStore.getState().pushUndo(currentDocument);

  useDocumentSessionStore.getState().setIsFlushing(true);
  try {
    await flushDocumentSaves(currentDocument.id);
    let workingDocument = currentDocument;
    const selectedIds = new Set(selectedBlocks.map((block) => block.id));
    const selectedIndices = currentDocument.blocks
      .map((block, index) => (selectedIds.has(block.id) ? index : -1))
      .filter((index) => index >= 0);
    const firstSelectedIndex = selectedIndices[0] ?? -1;
    const lastSelectedIndex = selectedIndices.at(-1) ?? -1;
    const previousBlockId = firstSelectedIndex > 0 ? currentDocument.blocks[firstSelectedIndex - 1]?.id ?? null : null;
    const nextBlockId =
      lastSelectedIndex >= 0 && lastSelectedIndex < currentDocument.blocks.length - 1
        ? currentDocument.blocks[lastSelectedIndex + 1]?.id ?? null
        : null;
    const isWholeDocumentSelection = selectedBlocks.length === currentDocument.blocks.length;

    if (isWholeDocumentSelection) {
      const survivorId = selectedBlocks[0]?.id ?? null;
      for (const block of selectedBlocks.slice(1).reverse()) {
        clearBlockSync(currentDocument.id, block.id);
        workingDocument = toDocumentVm(await desktopApi.deleteBlock(block.id));
        enqueueSyncMutation({ kind: 'block-deleted', documentId: currentDocument.id, blockId: block.id });
      }

      const survivor = survivorId
        ? workingDocument.blocks.find((block) => block.id === survivorId) ?? workingDocument.blocks[0] ?? null
        : null;
      if (survivor) {
        await clearBlockContent(survivor);
        enqueueSyncMutation({ kind: 'block-updated', documentId: currentDocument.id, blockId: survivor.id });
      }
    } else {
      for (const block of selectedBlocks.slice().reverse()) {
        clearBlockSync(currentDocument.id, block.id);
        workingDocument = toDocumentVm(await desktopApi.deleteBlock(block.id));
        enqueueSyncMutation({ kind: 'block-deleted', documentId: currentDocument.id, blockId: block.id });
      }
    }

    const nextDocument = toDocumentVm(await desktopApi.openDocument(currentDocument.id));
    updateDocumentState(nextDocument);
    clearBlockSelectionState();

    const focusTargetId =
      (previousBlockId && nextDocument.blocks.some((block) => block.id === previousBlockId) ? previousBlockId : null)
      ?? (nextBlockId && nextDocument.blocks.some((block) => block.id === nextBlockId) ? nextBlockId : null)
      ?? nextDocument.blocks[0]?.id
      ?? null;

    if (focusTargetId) {
      const caret = focusTargetId === previousBlockId ? 'end' : 'start';
      useDocumentSessionStore.getState().requestBlockFocus(focusTargetId, caret);
    }
  } catch (error) {
    reportError(error, '선택한 블록을 삭제하지 못했습니다.');
  } finally {
    useDocumentSessionStore.getState().setIsFlushing(false);
  }
}

// --- Block Undo / Redo ---

export async function undoBlockOperation() {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) return;

  const previousDoc = useBlockHistoryStore.getState().popUndo();
  if (!previousDoc) return;

  await executeWithErrorHandling(async () => {
    useBlockHistoryStore.getState().pushRedo(currentDocument);
    await flushDocumentSaves(currentDocument.id);
    const restored = toDocumentVm(
      await desktopApi.restoreDocumentBlocks(
        currentDocument.id,
        previousDoc.blocks.map((b) => ({
          id: b.id,
          kind: b.kind,
          content: b.content,
          language: b.kind === 'code' ? b.language : null,
          position: b.position,
        })),
      ),
    );
    updateDocumentState(restored);
    clearBlockSelectionState();
    const focusId = restored.blocks[0]?.id ?? null;
    if (focusId) {
      useDocumentSessionStore.getState().requestBlockFocus(focusId, 'start');
    }
  }, '되돌리기에 실패했습니다.');
}

export async function redoBlockOperation() {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) return;

  const nextDoc = useBlockHistoryStore.getState().popRedo();
  if (!nextDoc) return;

  await executeWithErrorHandling(async () => {
    useBlockHistoryStore.getState().pushUndo(currentDocument);
    await flushDocumentSaves(currentDocument.id);
    const restored = toDocumentVm(
      await desktopApi.restoreDocumentBlocks(
        currentDocument.id,
        nextDoc.blocks.map((b) => ({
          id: b.id,
          kind: b.kind,
          content: b.content,
          language: b.kind === 'code' ? b.language : null,
          position: b.position,
        })),
      ),
    );
    updateDocumentState(restored);
    clearBlockSelectionState();
    const focusId = restored.blocks[0]?.id ?? null;
    if (focusId) {
      useDocumentSessionStore.getState().requestBlockFocus(focusId, 'start');
    }
  }, '다시 실행에 실패했습니다.');
}
