import { useEffect, useRef } from 'react';
import { appUseCases, syncEventPort } from '../app/runtime';
import { isIcloudDebugEnabled } from '../lib/debugFlags';
import { useWorkspaceStore } from '../stores/workspaceStore';

export function useSyncEventListener() {
  const icloudSyncMode = useWorkspaceStore((state) => state.icloudSyncMode);
  const modeRef = useRef(icloudSyncMode);
  const subscriptionReadyRef = useRef(false);

  modeRef.current = icloudSyncMode;

  useEffect(() => {
    if (isIcloudDebugEnabled) {
      console.info('[icloud] subscribe:start', { icloudSyncMode: modeRef.current });
    }
    let unlistenFn: (() => void) | null = null;
    let disposed = false;

    void syncEventPort.subscribe((message) => {
      if (isIcloudDebugEnabled) {
        console.info('[icloud] event', message);
      }
      void appUseCases.handleSyncEventMessage(message);
    }).then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlistenFn = fn;
        subscriptionReadyRef.current = true;
        if (isIcloudDebugEnabled) {
          console.info('[icloud] subscribe:ready', { icloudSyncMode: modeRef.current });
        }
        if (modeRef.current === 'connected') {
          if (isIcloudDebugEnabled) {
            console.info('[icloud] refresh:requested-after-subscribe');
          }
          void appUseCases.refreshIcloudSync();
        }
      }
    });

    return () => {
      disposed = true;
      subscriptionReadyRef.current = false;
      unlistenFn?.();
    };
  }, []);

  useEffect(() => {
    if (icloudSyncMode !== 'connected' || !subscriptionReadyRef.current) {
      return;
    }

    if (isIcloudDebugEnabled) {
      console.info('[icloud] refresh:requested-after-enabled');
    }

    void appUseCases.refreshIcloudSync();
  }, [icloudSyncMode]);
}
