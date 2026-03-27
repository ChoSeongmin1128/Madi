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
        documents.map((document) => (
          <div
            key={document.id}
            className={`document-card${currentDocumentId === document.id ? ' is-active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              onOpenDocument(document.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenDocument(document.id);
              }
            }}
          >
            <div className="document-card-header">
              <span className="document-card-title">{getVisibleDocumentTitle(document.title)}</span>
            </div>
            <div className="document-card-sub">
              <span className="document-meta">{formatSidebarTimestamp(document.updatedAt)}</span>
              <span className="document-preview">{document.preview || ''}</span>
            </div>
            <SidebarDocumentMenu documentId={document.id} />
          </div>
        ))
      )}
    </div>
  );
}
