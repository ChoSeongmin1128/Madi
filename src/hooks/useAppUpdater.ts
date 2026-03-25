import { useEffect, useEffectEvent } from 'react';
import { APP_UPDATE_CHECK_INTERVAL_MS, runUpdateCheck } from '../lib/appUpdater';

export function useAppUpdater(enabled: boolean) {
  const triggerUpdateCheck = useEffectEvent(() => {
    void runUpdateCheck();
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    triggerUpdateCheck();

    const timerId = window.setInterval(() => {
      triggerUpdateCheck();
    }, APP_UPDATE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [enabled, triggerUpdateCheck]);
}
