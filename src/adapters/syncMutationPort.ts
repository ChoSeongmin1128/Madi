import type { SyncMutationPort } from '../application/ports/syncMutationPort';
import { enqueueSyncMutation } from '../services/syncBoundary';

export const syncMutationPort: SyncMutationPort = {
  enqueue(mutation) {
    enqueueSyncMutation(mutation);
  },
};
