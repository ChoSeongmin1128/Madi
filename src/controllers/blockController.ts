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
  normalizeErrorMessage,
  reportError,
  setDocumentWithFocus,
  toDocumentVm,
  updateDocumentState,
} from '../services/documentStateService';
import {
  type ClipboardBlockData,
  hasBlockDataInClipboard,
  clearBlockClipboard,
  readBlocksFromClipboard,
  writeBlocksToClipboard,
} from '../services/clipboardService';
import { enqueueSyncMutation } from '../services/syncBoundary';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
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

// --- Block CRUD ---

export async function createBlockBelow(afterBlockId: string | null, kind: BlockKind = 'markdown') {
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

export { hasBlockDataInClipboard, clearBlockClipboard };

export async function copySelectedBlocks() {
  const currentDocument = getCurrentDocument();
  if (!currentDocument || !useDocumentSessionStore.getState().allBlocksSelected) return;

  await writeBlocksToClipboard(currentDocument.blocks.map((b) => ({
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

export async function pasteBlocks() {
  await executeWithErrorHandling(async () => {
    const currentDocument = getCurrentDocument();
    if (!currentDocument) return;

    const blocksToInsert = await readBlocksFromClipboard();
    if (!blocksToInsert) return;

    const selectedBlockId = useDocumentSessionStore.getState().selectedBlockId;
    const selectedBlock = selectedBlockId ? findBlock(currentDocument, selectedBlockId) : null;
    const isSelectedEmpty = selectedBlock
      ? (selectedBlock.kind === 'code' ? !selectedBlock.content.trim() : isMarkdownContentEmpty(selectedBlock.content))
      : false;

    await flushCurrentDocument();
    let afterBlockId = selectedBlockId ?? currentDocument.blocks.at(-1)?.id ?? null;
    let firstNewBlockId: string | null = null;

    const firstData = blocksToInsert[0];
    if (isSelectedEmpty && selectedBlock && firstData) {
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
    useDocumentSessionStore.setState({ blockSelected: false, allBlocksSelected: false });
    if (firstNewBlockId) {
      useDocumentSessionStore.getState().requestBlockFocus(firstNewBlockId, 'start');
    }
  }, '블록을 붙여넣지 못했습니다.');
}

export async function deleteSelectedBlocks() {
  const session = useDocumentSessionStore.getState();
  const currentDocument = session.currentDocument;
  if (!currentDocument || !session.allBlocksSelected || currentDocument.blocks.length === 0) return;

  useDocumentSessionStore.getState().setIsFlushing(true);
  try {
    await flushDocumentSaves(currentDocument.id);
    let workingDocument = currentDocument;
    const survivorId = currentDocument.blocks[0]?.id ?? null;

    for (const block of currentDocument.blocks.slice(1)) {
      clearBlockSync(currentDocument.id, block.id);
      workingDocument = toDocumentVm(await desktopApi.deleteBlock(block.id));
      enqueueSyncMutation({ kind: 'block-deleted', documentId: currentDocument.id, blockId: block.id });
    }

    const survivor = survivorId
      ? workingDocument.blocks.find((b) => b.id === survivorId) ?? workingDocument.blocks[0] ?? null
      : null;
    if (survivor) {
      if ((survivor.kind === 'markdown' || survivor.kind === 'text') && !isMarkdownContentEmpty(survivor.content)) {
        await desktopApi.updateMarkdownBlock(survivor.id, createEmptyMarkdownContent());
      } else if (survivor.kind === 'code' && survivor.content.length > 0) {
        await desktopApi.updateCodeBlock(survivor.id, '', survivor.language);
      }
    }

    const nextDocument = toDocumentVm(await desktopApi.openDocument(currentDocument.id));
    updateDocumentState(nextDocument);
    useDocumentSessionStore.getState().setAllBlocksSelected(false);
    if (nextDocument.blocks[0]) {
      useDocumentSessionStore.getState().requestBlockFocus(nextDocument.blocks[0].id, 'start');
    }
  } catch (error) {
    reportError(error, '선택한 블록을 삭제하지 못했습니다.');
  } finally {
    useDocumentSessionStore.getState().setIsFlushing(false);
  }
}
