import { summarizeDocument, toDocumentVm, type DocumentVm } from '../adapters/documentAdapter';
import { setDocumentSyncErrorHandler } from './documentSync';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { BlockCaretPlacement } from '../lib/types';

export function normalizeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function clearError() {
  useWorkspaceStore.getState().setError(null);
}

export function reportError(error: unknown, fallback: string) {
  useWorkspaceStore.getState().setError(normalizeErrorMessage(error, fallback));
}

export function getCurrentDocument() {
  return useDocumentSessionStore.getState().currentDocument;
}

export function findBlock(document: DocumentVm, blockId: string) {
  return document.blocks.find((block) => block.id === blockId) ?? null;
}

export function updateDocumentState(document: DocumentVm) {
  useDocumentSessionStore.setState({
    currentDocument: document,
    lastSavedAt: document.updatedAt,
  });
  useWorkspaceStore.getState().upsertDocumentSummary(summarizeDocument(document));
}

export function setDocumentWithFocus(
  document: DocumentVm,
  focusBlockId: string | null,
  caret: BlockCaretPlacement = 'start',
) {
  const targetBlock = focusBlockId
    ? document.blocks.find((b) => b.id === focusBlockId) ?? document.blocks[0]
    : document.blocks[0];

  useDocumentSessionStore.setState({
    currentDocument: document,
    selectedBlockId: targetBlock?.id ?? null,
    selectedBlockIds: [],
    blockSelected: false,
    allBlocksSelected: false,
    focusRequest: targetBlock
      ? { blockId: targetBlock.id, caret, nonce: Date.now() + Math.random() }
      : null,
    lastSavedAt: document.updatedAt,
  });
  useWorkspaceStore.getState().upsertDocumentSummary(summarizeDocument(document));
}

export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
): Promise<T | undefined> {
  try {
    const result = await operation();
    clearError();
    return result;
  } catch (error) {
    reportError(error, errorMessage);
    return undefined;
  }
}

export { toDocumentVm, summarizeDocument };

setDocumentSyncErrorHandler((error, context) => {
  const fallback =
    context.phase === 'autosave'
      ? '변경 내용을 자동 저장하지 못했습니다.'
      : '변경 내용을 저장하지 못했습니다.';
  reportError(error, fallback);
});
