import type { DocumentVm } from '../adapters/documentAdapter';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
export {
  normalizeErrorMessage,
  clearError,
  reportError as reportWorkspaceError,
  getCurrentDocument,
  findBlock,
  updateDocumentState as updateTouchedDocument,
} from '../services/documentStateService';

export function setCurrentDocument(document: DocumentVm | null) {
  if (!document) {
    useDocumentSessionStore.setState({
      currentDocument: null,
      selectedBlockId: null,
      selectedBlockIds: [],
      blockSelected: false,
      allBlocksSelected: false,
      focusRequest: null,
      lastSavedAt: null,
    });
    return;
  }

  useDocumentSessionStore.getState().setCurrentDocument(document);
}
