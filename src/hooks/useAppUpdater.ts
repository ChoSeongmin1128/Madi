import { useEffect } from 'react';
import { APP_UPDATE_CHECK_INTERVAL_MS, runUpdateCheckFrom } from '../lib/appUpdater';

export function useAppUpdater(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
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
