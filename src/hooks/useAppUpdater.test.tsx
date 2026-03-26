import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  runUpdateCheckFrom: vi.fn(),
}));

vi.mock('../lib/appUpdater', () => ({
  APP_UPDATE_CHECK_INTERVAL_MS: 6 * 60 * 60 * 1000,
  runUpdateCheckFrom: mocks.runUpdateCheckFrom,
}));

import { useAppUpdater } from './useAppUpdater';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useAppUpdater', () => {
  it('does not rerun the initial check on ordinary rerenders', () => {
    const { rerender } = renderHook(({ enabled }) => useAppUpdater(enabled), {
      initialProps: { enabled: true },
    });

    rerender({ enabled: true });
    rerender({ enabled: true });

    expect(mocks.runUpdateCheckFrom).toHaveBeenCalledTimes(1);
    expect(mocks.runUpdateCheckFrom).toHaveBeenCalledWith('auto-initial');
  });

  it('schedules interval checks without retriggering the initial check on rerender', () => {
    vi.useFakeTimers();

    const { rerender } = renderHook(({ enabled }) => useAppUpdater(enabled), {
      initialProps: { enabled: true },
    });

    rerender({ enabled: true });
    vi.advanceTimersByTime(6 * 60 * 60 * 1000);

    expect(mocks.runUpdateCheckFrom).toHaveBeenNthCalledWith(1, 'auto-initial');
    expect(mocks.runUpdateCheckFrom).toHaveBeenNthCalledWith(2, 'auto-interval');
    expect(mocks.runUpdateCheckFrom).toHaveBeenCalledTimes(2);
  });

  it('runs the initial check once when the hook becomes enabled', () => {
    const { rerender } = renderHook(({ enabled }) => useAppUpdater(enabled), {
      initialProps: { enabled: false },
    });

    expect(mocks.runUpdateCheckFrom).not.toHaveBeenCalled();

    rerender({ enabled: true });
    rerender({ enabled: true });

    expect(mocks.runUpdateCheckFrom).toHaveBeenCalledTimes(1);
    expect(mocks.runUpdateCheckFrom).toHaveBeenCalledWith('auto-initial');
  });
});
