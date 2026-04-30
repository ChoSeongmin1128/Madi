import { FileSearch } from 'lucide-react';
import type { DocumentSummaryVm } from '../../application/models/document';
import { getVisibleDocumentTitle } from '../../lib/documentTitle';
import { SidebarDocumentMenu } from '../SidebarDocumentMenu';
import { formatSidebarTimestamp } from './shared';

interface SidebarDocumentListProps {
  currentDocumentId: string | null;
  documents: DocumentSummaryVm[];
  onOpenDocument: (documentId: string) => void;
}

export function SidebarDocumentList({
  currentDocumentId,
  documents,
  onOpenDocument,
}: SidebarDocumentListProps) {
  return (
    <div className="document-list">
      {documents.length === 0 ? (
        <div className="empty-state">
          <FileSearch />
          <p>검색 결과가 없습니다.</p>
        </div>
      ) : (
        documents.map((document) => {
          const isActive = currentDocumentId === document.id;
          const documentTitle = getVisibleDocumentTitle(document.title);

          return (
            <div
              key={document.id}
              className={`document-card-shell${isActive ? ' is-active' : ''}`}
            >
              <button
                className="document-card"
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onOpenDocument(document.id);
                }}
              >
                <span className="document-card-header">
                  <span className="document-card-title">{documentTitle}</span>
                </span>
                <span className="document-card-sub">
                  <span className="document-meta">{formatSidebarTimestamp(document.updatedAt)}</span>
                  <span className="document-preview">{document.preview || ''}</span>
                </span>
              </button>
              <SidebarDocumentMenu documentId={document.id} documentTitle={documentTitle} />
            </div>
          );
        })
      )}
    </div>
  );
}
