import type { DocumentSyncPort } from '../application/ports/documentSyncPort';
import {
  clearAllDocumentSync,
  clearBlockSync,
  clearDocumentSync,
  flushDocumentSaves,
  queueDocumentSave,
  setDocumentSyncErrorHandler,
} from '../services/documentSync';

export const documentSyncPort: DocumentSyncPort = {
  queueDocumentSave(documentId, blockId, save) {
    queueDocumentSave(documentId, blockId, save);
  },
  flushDocumentSaves(documentId) {
    return flushDocumentSaves(documentId);
  },
  clearDocumentSync(documentId) {
    clearDocumentSync(documentId);
  },
  clearAllDocumentSync() {
    clearAllDocumentSync();
  },
  clearBlockSync(documentId, blockId) {
    clearBlockSync(documentId, blockId);
  },
  setErrorHandler(handler) {
    setDocumentSyncErrorHandler(handler);
  },
};
