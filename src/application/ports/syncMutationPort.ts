import type { SyncMutation } from '../../services/syncBoundary';

export interface SyncMutationPort {
  enqueue(mutation: SyncMutation): void;
}
