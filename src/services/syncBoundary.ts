export type SyncMutation =
  | { kind: 'document-created'; documentId: string }
  | { kind: 'document-deleted'; documentId: string }
  | { kind: 'documents-reset' }
  | { kind: 'document-renamed'; documentId: string }
  | { kind: 'document-reordered-blocks'; documentId: string }
  | { kind: 'block-created'; documentId: string; blockId: string }
  | { kind: 'block-deleted'; documentId: string; blockId: string }
  | { kind: 'block-updated'; documentId: string; blockId: string };

export interface SyncAdapter {
  enqueue(mutation: SyncMutation): Promise<void> | void;
}

class NoopSyncAdapter implements SyncAdapter {
  enqueue(mutation: SyncMutation) {
    void mutation;
  }
}

let activeSyncAdapter: SyncAdapter = new NoopSyncAdapter();

export function setSyncAdapter(adapter: SyncAdapter) {
  activeSyncAdapter = adapter;
}

export function enqueueSyncMutation(mutation: SyncMutation) {
  activeSyncAdapter.enqueue(mutation);
}
