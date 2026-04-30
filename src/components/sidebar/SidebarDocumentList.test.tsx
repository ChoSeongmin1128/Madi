import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentSummaryVm } from '../../application/models/document';
import { SidebarDocumentList } from './SidebarDocumentList';

const controllerMocks = vi.hoisted(() => ({
  deleteDocument: vi.fn(async () => true),
}));

vi.mock('../../app/controllers', () => ({
  useDocumentController: () => ({
    deleteDocument: controllerMocks.deleteDocument,
  }),
}));

const documentSummary: DocumentSummaryVm = {
  id: 'doc-1',
  title: '회의 메모',
  blockTintOverride: null,
  documentSurfaceToneOverride: null,
  preview: '다음 액션 정리',
  updatedAt: new Date('2026-04-29T08:00:00Z').getTime(),
  lastOpenedAt: new Date('2026-04-29T08:00:00Z').getTime(),
  blockCount: 1,
};

describe('SidebarDocumentList', () => {
  afterEach(() => {
    vi.clearAllMocks();
    controllerMocks.deleteDocument.mockResolvedValue(true);
  });

  it('keeps the document action outside the document open button', () => {
    render(
      <SidebarDocumentList
        currentDocumentId="doc-1"
        documents={[documentSummary]}
        onOpenDocument={vi.fn()}
      />,
    );

    const openButton = screen.getByRole('button', { name: /회의 메모/ });
    const deleteButton = screen.getByRole('button', { name: '문서 삭제' });

    expect(openButton).not.toContainElement(deleteButton);
    expect(openButton).toHaveAttribute('aria-current', 'page');
  });

  it('does not open the document when the delete action is clicked', async () => {
    const user = userEvent.setup();
    const onOpenDocument = vi.fn();

    render(
      <SidebarDocumentList
        currentDocumentId={null}
        documents={[documentSummary]}
        onOpenDocument={onOpenDocument}
      />,
    );

    await user.click(screen.getByRole('button', { name: '문서 삭제' }));

    expect(controllerMocks.deleteDocument).toHaveBeenCalledWith('doc-1');
    expect(onOpenDocument).not.toHaveBeenCalled();
  });
});
