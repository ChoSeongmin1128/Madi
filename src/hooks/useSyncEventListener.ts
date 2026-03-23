import { useEffect } from 'react';
import { appUseCases, syncEventPort } from '../app/runtime';

export function useSyncEventListener() {
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    let disposed = false;

    void syncEventPort.subscribe((message) => {
      void appUseCases.handleSyncEventMessage(message);
    }).then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlistenFn = fn;
      }
    });

    return () => {
      disposed = true;
      unlistenFn?.();
    };
  }, []);
}
