import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ICloudSyncStatus } from '../../lib/types';
import { SettingsICloudSection } from './SettingsICloudSection';

const baseStatus: ICloudSyncStatus = {
  enabled: true,
  state: 'idle',
  accountStatus: 'available',
  pendingOperationCount: 0,
  lastSyncStartedAtMs: null,
  lastSyncSucceededAtMs: null,
  lastErrorCode: null,
  lastErrorMessage: null,
};

function renderSection(overrides: Partial<ComponentProps<typeof SettingsICloudSection>> = {}) {
  const props: ComponentProps<typeof SettingsICloudSection> = {
    mode: 'advanced',
    status: baseStatus,
    debugInfo: null,
    debugError: null,
    debugLoading: false,
    onEnabledChange: vi.fn(),
    onRunSync: vi.fn(),
    onRefreshDebug: vi.fn(),
    onResetCheckpoint: vi.fn(),
    onForceUpload: vi.fn(),
    onForceRedownload: vi.fn(),
    ...overrides,
  };

  render(<SettingsICloudSection {...props} />);
  return props;
}

describe('SettingsICloudSection', () => {
  it('confirms force upload inside the settings window', async () => {
    const user = userEvent.setup();
    const onForceUpload = vi.fn();

    renderSection({ onForceUpload });

    await user.click(screen.getByRole('button', { name: 'Madi 클라우드로 다시 올리기' }));

    expect(onForceUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Madi 클라우드 다시 올리기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 올리기 실행' }));

    expect(onForceUpload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'Madi 클라우드 다시 올리기' })).not.toBeInTheDocument();
  });

  it('cancels force redownload without running the recovery action', async () => {
    const user = userEvent.setup();
    const onForceRedownload = vi.fn();

    renderSection({ onForceRedownload });

    await user.click(screen.getByRole('button', { name: 'Madi 클라우드에서 다시 받기' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(onForceRedownload).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'Madi 클라우드 다시 받기' })).not.toBeInTheDocument();
  });
});
