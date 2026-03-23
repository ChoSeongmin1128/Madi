import type { SyncEventMessage } from '../../lib/types';

export interface SyncEventPort {
  subscribe(handler: (message: SyncEventMessage) => void): Promise<() => void>;
}
