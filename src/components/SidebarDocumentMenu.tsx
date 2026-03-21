import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deleteDocument } from '../controllers/appController';

interface SidebarDocumentMenuProps {
  documentId: string;
}

export function SidebarDocumentMenu({ documentId }: SidebarDocumentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="document-row-menu" ref={rootRef}>
      <button
        className="icon-button document-row-menu-trigger"
        type="button"
        aria-label="문서 메뉴"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {isOpen ? (
        <div className="document-row-menu-popover" role="menu">
          <button
            className="document-menu-danger"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
              void deleteDocument(documentId);
            }}
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
