export type PendingDocumentSave =
  | { kind: 'markdown'; content: string }
  | { kind: 'code'; content: string; language: string | null }
  | { kind: 'text'; content: string };

export interface DocumentSyncErrorContext {
  documentId: string;
  blockId: string;
  phase: 'autosave' | 'flush';
}

export interface DocumentSyncPort {
  queueDocumentSave(documentId: string, blockId: string, save: PendingDocumentSave): void;
  flushDocumentSaves(documentId: string): Promise<number | null>;
  clearDocumentSync(documentId: string): void;
  clearAllDocumentSync(): void;
  clearBlockSync(documentId: string, blockId: string): void;
  setErrorHandler(handler: ((error: unknown, context: DocumentSyncErrorContext) => void) | null): void;
}
