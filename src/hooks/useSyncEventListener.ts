import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { toDocumentSummaryVm, toDocumentVm } from '../adapters/documentAdapter';
import { desktopApi } from '../lib/desktopApi';
import type { SyncEventMessage } from '../lib/types';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export function useSyncEventListener() {
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    void listen<SyncEventMessage>('icloud-sync-event', (event) => {
      const message = event.payload;

      if (message.type === 'status') {
        const state = message.state === 'idle' ? 'idle'
          : message.state === 'syncing' ? 'syncing'
          : 'error';
        useWorkspaceStore.getState().setIcloudSyncStatus({
          state,
          lastSyncAt: message.lastSyncAt ?? null,
          errorMessage: null,
        });

      } else if (message.type === 'remote-changed') {
        void (async () => {
          try {
            const payload = await desktopApi.applyRemoteDocuments(message.documents);
            const workspace = useWorkspaceStore.getState();
            workspace.setDocuments(payload.documents.map(toDocumentSummaryVm));
            workspace.setTrashDocuments(payload.trashDocuments.map(toDocumentSummaryVm));

            // 현재 열린 문서가 원격에서 변경된 경우 다시 로드
            const currentDoc = useDocumentSessionStore.getState().currentDocument;
            if (currentDoc) {
              const updated = payload.currentDocument;
              if (updated && updated.id === currentDoc.id) {
                useDocumentSessionStore.getState().setCurrentDocument(toDocumentVm(updated));
              }
            }
          } catch {
            // 원격 적용 실패는 조용히 무시
          }
        })();

      } else if (message.type === 'error') {
        useWorkspaceStore.getState().setIcloudSyncStatus({
          state: 'error',
          lastSyncAt: useWorkspaceStore.getState().icloudSyncStatus.lastSyncAt,
          errorMessage: message.message,
        });
      }
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      unlistenFn?.();
    };
  }, []);
}
