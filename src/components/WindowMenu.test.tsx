import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowMenu } from './WindowMenu';
import { useWorkspaceStore } from '../stores/workspaceStore';

const actions = vi.hoisted(() => ({
  previewWindowOpacityPercent: vi.fn(),
  setWindowOpacityPercent: vi.fn(),
}));

vi.mock('../app/controllers', () => ({
  usePreferencesController: () => ({
    previewWindowOpacityPercent: actions.previewWindowOpacityPercent,
    setWindowOpacityPercent: actions.setWindowOpacityPercent,
  }),
}));

describe('WindowMenu', () => {
  beforeEach(() => {
    actions.previewWindowOpacityPercent.mockReset();
    actions.setWindowOpacityPercent.mockReset();
    actions.previewWindowOpacityPercent.mockImplementation(async (value: number) => value);
    actions.setWindowOpacityPercent.mockImplementation(async (value: number) => value);
    useWorkspaceStore.setState({
      alwaysOnTopEnabled: false,
      windowOpacityPercent: 100,
    });
  });

  it('renders quick app window controls and dispatches changes', async () => {
    render(<WindowMenu />);

    await userEvent.click(screen.getByRole('button', { name: '창 투명도 메뉴' }));

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    const slider = screen.getByRole('slider');
    fireEvent.input(slider, { target: { value: '82' } });
    expect(actions.previewWindowOpacityPercent).toHaveBeenCalledWith(82);
    fireEvent.pointerUp(slider, { target: { value: '82' } });
    expect(actions.setWindowOpacityPercent).toHaveBeenCalledWith(82);
    useWorkspaceStore.setState({ windowOpacityPercent: 82 });

    await userEvent.click(screen.getByRole('button', { name: '100%로 복원' }));
    expect(actions.setWindowOpacityPercent).toHaveBeenCalledWith(100);
  });
});
