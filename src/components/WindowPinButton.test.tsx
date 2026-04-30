import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { WindowPinButton } from './WindowPinButton';

const actions = vi.hoisted(() => ({
  setAlwaysOnTopEnabled: vi.fn(),
}));

vi.mock('../app/controllers', () => ({
  usePreferencesController: () => ({
    setAlwaysOnTopEnabled: actions.setAlwaysOnTopEnabled,
  }),
}));

describe('WindowPinButton', () => {
  beforeEach(() => {
    actions.setAlwaysOnTopEnabled.mockReset();
    useWorkspaceStore.setState({
      alwaysOnTopEnabled: false,
    });
  });

  it('pins the window from the header', async () => {
    render(<WindowPinButton />);

    const button = screen.getByRole('button', { name: '창을 항상 위에 고정' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);

    expect(actions.setAlwaysOnTopEnabled).toHaveBeenCalledWith(true);
  });

  it('unpins the window when already pinned', async () => {
    useWorkspaceStore.setState({
      alwaysOnTopEnabled: true,
    });

    render(<WindowPinButton />);

    const button = screen.getByRole('button', { name: '창 항상 위 고정 해제' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);

    expect(actions.setAlwaysOnTopEnabled).toHaveBeenCalledWith(false);
  });
});
