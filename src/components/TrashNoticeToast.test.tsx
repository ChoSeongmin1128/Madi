import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../stores/uiStore';
import { TrashNoticeToast } from './TrashNoticeToast';

const controllerMocks = vi.hoisted(() => ({
  restoreDocumentFromTrash: vi.fn(async () => true),
}));

vi.mock('../app/controllers', () => ({
  useDocumentController: () => ({
    restoreDocumentFromTrash: controllerMocks.restoreDocumentFromTrash,
  }),
}));

describe('TrashNoticeToast', () => {
  beforeEach(() => {
    useUiStore.setState({ trashNotice: null });
    controllerMocks.restoreDocumentFromTrash.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('restores the deleted document from the notice action', async () => {
    const user = userEvent.setup();
    useUiStore.getState().showTrashNotice('doc-1', '회의 메모');

    render(<TrashNoticeToast />);

    expect(screen.getByRole('status')).toHaveTextContent('회의 메모 문서를 휴지통으로 이동했습니다.');

    await user.click(screen.getByRole('button', { name: '복원' }));

    expect(controllerMocks.restoreDocumentFromTrash).toHaveBeenCalledWith('doc-1');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dismisses the notice without restoring', async () => {
    const user = userEvent.setup();
    useUiStore.getState().showTrashNotice('doc-1', '회의 메모');

    render(<TrashNoticeToast />);

    await user.click(screen.getByRole('button', { name: '알림 닫기' }));

    expect(controllerMocks.restoreDocumentFromTrash).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
