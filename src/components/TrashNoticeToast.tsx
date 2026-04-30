import { RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';
import { useDocumentController } from '../app/controllers';
import { useUiStore } from '../stores/uiStore';

const NOTICE_TIMEOUT_MS = 5_000;

export function TrashNoticeToast() {
  const { restoreDocumentFromTrash } = useDocumentController();
  const trashNotice = useUiStore((state) => state.trashNotice);
  const clearTrashNotice = useUiStore((state) => state.clearTrashNotice);

  useEffect(() => {
    if (!trashNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearTrashNotice(trashNotice.id);
    }, NOTICE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearTrashNotice, trashNotice]);

  if (!trashNotice) {
    return null;
  }

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <span className="app-toast-message">
        {trashNotice.title} 문서를 휴지통으로 이동했습니다.
      </span>
      <button
        className="ghost-button app-toast-action"
        type="button"
        onClick={() => {
          const noticeId = trashNotice.id;
          void restoreDocumentFromTrash(trashNotice.documentId).then((restored) => {
            if (restored) {
              clearTrashNotice(noticeId);
            }
          });
        }}
      >
        <RotateCcw size={13} />
        복원
      </button>
      <button
        className="icon-button app-toast-close"
        type="button"
        aria-label="알림 닫기"
        onClick={() => clearTrashNotice(trashNotice.id)}
      >
        <X size={13} />
      </button>
    </div>
  );
}
