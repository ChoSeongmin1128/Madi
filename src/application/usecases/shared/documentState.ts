import {
  summarizeDocument,
  toDocumentSummaryVm,
  toDocumentVm,
  type DocumentVm,
} from '../../../adapters/documentAdapter';
import type { BlockCaretPlacement, BootstrapPayload } from '../../../lib/types';
import type { SessionGateway } from '../../ports/sessionGateway';
import type { WorkspaceGateway } from '../../ports/workspaceGateway';

export type CurrentDocumentStrategy = 'always' | 'if-missing' | 'match-current';

export function findBlock(document: DocumentVm, blockId: string) {
  return document.blocks.find((block) => block.id === blockId) ?? null;
}

export function updateDocumentState(
  session: SessionGateway,
  workspace: WorkspaceGateway,
  document: DocumentVm,
) {
  session.setCurrentDocumentState(document);
  workspace.upsertDocumentSummary(summarizeDocument(document));
}

export function setDocumentWithFocus(
  session: SessionGateway,
  workspace: WorkspaceGateway,
  document: DocumentVm,
  focusBlockId: string | null,
  caret: BlockCaretPlacement = 'start',
) {
  session.setDocumentWithFocus(document, focusBlockId, caret);
  workspace.upsertDocumentSummary(summarizeDocument(document));
}

export function applyBootstrapPayloadState(
  workspace: WorkspaceGateway,
  session: SessionGateway,
  payload: BootstrapPayload,
  currentDocumentStrategy: CurrentDocumentStrategy = 'always',
) {
  workspace.setDocuments(payload.documents.map(toDocumentSummaryVm));
  workspace.setTrashDocuments(payload.trashDocuments.map(toDocumentSummaryVm));
  workspace.setThemeMode(payload.themeMode);
  workspace.setDefaultBlockTintPreset(payload.defaultBlockTintPreset);
  workspace.setDefaultBlockKind(payload.defaultBlockKind);
  workspace.setIcloudSyncEnabled(payload.icloudSyncEnabled);
  workspace.setMenuBarIconEnabled(payload.menuBarIconEnabled);

  const nextDocument = payload.currentDocument ? toDocumentVm(payload.currentDocument) : null;
  if (currentDocumentStrategy === 'always') {
    session.setCurrentDocument(nextDocument);
    return;
  }

  if (currentDocumentStrategy === 'if-missing') {
    if (!session.getCurrentDocument()) {
      session.setCurrentDocument(nextDocument);
    }
    return;
  }

  const currentDocument = session.getCurrentDocument();
  if (currentDocument && nextDocument && currentDocument.id === nextDocument.id) {
    session.setCurrentDocument(nextDocument);
  }
}
