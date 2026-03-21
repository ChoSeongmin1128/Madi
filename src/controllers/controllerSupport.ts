import { summarizeDocument, type BlockVm, type DocumentVm } from '../adapters/documentAdapter';
import { setDocumentSyncErrorHandler } from '../services/documentSync';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export function normalizeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function clearError() {
  useWorkspaceStore.getState().setError(null);
}

export function reportWorkspaceError(error: unknown, fallback: string) {
  useWorkspaceStore.getState().setError(normalizeErrorMessage(error, fallback));
}

export function getCurrentDocument() {
  return useDocumentSessionStore.getState().currentDocument;
}

export function setCurrentDocument(document: DocumentVm | null, options?: { preserveSelection?: boolean }) {
  if (!document) {
    useDocumentSessionStore.setState({
      currentDocument: null,
      selectedBlockId: null,
      allBlocksSelected: false,
      focusRequest: null,
      lastSavedAt: null,
    });
    return;
  }

  if (options?.preserveSelection) {
    const current = useDocumentSessionStore.getState();
    useDocumentSessionStore.setState({
      currentDocument: document,
      selectedBlockId: current.selectedBlockId,
      allBlocksSelected: current.allBlocksSelected,
      focusRequest: current.focusRequest,
      lastSavedAt: document.updatedAt,
    });
    return;
  }

  useDocumentSessionStore.getState().setCurrentDocument(document);
}

export function updateTouchedDocument(updatedDocument: DocumentVm) {
  useDocumentSessionStore.setState({
    currentDocument: updatedDocument,
    lastSavedAt: updatedDocument.updatedAt,
  });
  useWorkspaceStore.getState().upsertDocumentSummary(summarizeDocument(updatedDocument));
}

export function findBlock(document: DocumentVm, blockId: string) {
  return document.blocks.find((block) => block.id === blockId) ?? null;
}

setDocumentSyncErrorHandler((error, context) => {
  const fallback =
    context.phase === 'autosave'
      ? '변경 내용을 자동 저장하지 못했습니다.'
      : '변경 내용을 저장하지 못했습니다.';
  reportWorkspaceError(error, fallback);
});

export function applyUpdatedBlock(block: BlockVm) {
  const currentDocument = getCurrentDocument();
  if (!currentDocument) {
    return;
  }

  const nextDocument: DocumentVm = {
    ...currentDocument,
    blocks: currentDocument.blocks
      .map((currentBlock) => (currentBlock.id === block.id ? block : currentBlock))
      .sort((left, right) => left.position - right.position),
  };

  useDocumentSessionStore.setState({ currentDocument: nextDocument });
  useWorkspaceStore.getState().upsertDocumentSummary(summarizeDocument(nextDocument));
}
