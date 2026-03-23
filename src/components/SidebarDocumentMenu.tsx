import { Trash2 } from 'lucide-react';
import { deleteDocument } from '../controllers/appController';

interface SidebarDocumentMenuProps {
  documentId: string;
}

export function SidebarDocumentMenu({ documentId }: SidebarDocumentMenuProps) {
  return (
    <button
      className="icon-button document-card-action is-danger"
      type="button"
      aria-label="문서 삭제"
      onClick={(event) => {
        event.stopPropagation();
        void deleteDocument(documentId);
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
