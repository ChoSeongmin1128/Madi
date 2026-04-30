import { useEffect } from 'react';
import { APP_UPDATE_CHECK_INTERVAL_MS, runUpdateCheckFrom } from '../lib/appUpdater';
import { isBrowserPreviewRuntime } from '../lib/runtimeEnv';

export function useAppUpdater(enabled: boolean) {
  useEffect(() => {
    if (!enabled || isBrowserPreviewRuntime()) {
      return undefined;
    }

    void runUpdateCheckFrom('auto-initial');

    const timerId = window.setInterval(() => {
      void runUpdateCheckFrom('auto-interval');
    }, APP_UPDATE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [enabled]);
}
