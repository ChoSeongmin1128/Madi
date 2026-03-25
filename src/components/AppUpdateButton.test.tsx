import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppUpdateButton } from './AppUpdateButton';

const { applyPreparedUpdateMock } = vi.hoisted(() => ({
  applyPreparedUpdateMock: vi.fn(),
}));

vi.mock('../lib/appUpdater', async () => {
  const actual = await vi.importActual<typeof import('../lib/appUpdater')>('../lib/appUpdater');

  return {
    ...actual,
    applyPreparedUpdate: applyPreparedUpdateMock,
  };
});

describe('AppUpdateButton', () => {
  it('does not render while no update is available', () => {
    render(
      <AppUpdateButton
        status={{ state: 'idle', version: null, percent: null, message: null, lastCheckedAt: null }}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render while downloading', () => {
    render(
      <AppUpdateButton
        status={{
          state: 'available_downloading',
          version: '1.1.0',
          percent: 42,
          message: null,
          lastCheckedAt: Date.now(),
        }}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies the prepared update when the update is ready', async () => {
    const user = userEvent.setup();

    render(
      <AppUpdateButton
        status={{
          state: 'ready_to_install',
          version: '1.1.0',
          percent: 100,
          message: null,
          lastCheckedAt: Date.now(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '업데이트' }));

    expect(applyPreparedUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled installing pill while an update is applying', () => {
    render(
      <AppUpdateButton
        status={{
          state: 'installing',
          version: '1.1.0',
          percent: null,
          message: null,
          lastCheckedAt: Date.now(),
        }}
      />,
    );

    expect(screen.getByRole('button', { name: '업데이트 중' })).toBeDisabled();
  });
});
