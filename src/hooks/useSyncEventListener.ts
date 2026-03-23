import { useEffect } from 'react';
import { appUseCases, syncEventPort } from '../application/runtime';

export function useSyncEventListener() {
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    void syncEventPort.subscribe((message) => {
      void appUseCases.handleSyncEventMessage(message);
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      unlistenFn?.();
    };
  }, []);
}
