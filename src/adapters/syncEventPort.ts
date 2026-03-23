import { listen } from '@tauri-apps/api/event';
import type { SyncEventPort } from '../application/ports/syncEventPort';
import type { SyncEventMessage } from '../lib/types';

export const syncEventPort: SyncEventPort = {
  subscribe(handler) {
    return listen<SyncEventMessage>('icloud-sync-event', (event) => {
      handler(event.payload);
    });
  },
};
