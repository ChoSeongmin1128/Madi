import { Trash2 } from 'lucide-react';
import { useDocumentController } from '../app/controllers';
import { useUiStore } from '../stores/uiStore';

interface SidebarDocumentMenuProps {
  documentId: string;
  documentTitle: string;
}

export function SidebarDocumentMenu({ documentId, documentTitle }: SidebarDocumentMenuProps) {
  const { deleteDocument } = useDocumentController();
  const showTrashNotice = useUiStore((state) => state.showTrashNotice);

  return (
    <button
      className="icon-button document-card-action is-danger"
      type="button"
      aria-label="문서 삭제"
      onClick={(event) => {
        event.stopPropagation();
        void deleteDocument(documentId).then((deleted) => {
          if (deleted) {
            showTrashNotice(documentId, documentTitle);
          }
        });
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
