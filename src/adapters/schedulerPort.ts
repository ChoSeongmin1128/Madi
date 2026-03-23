import type { SchedulerPort } from '../application/ports/schedulerPort';

export const schedulerPort: SchedulerPort = {
  setTimeout(callback, delayMs) {
    return window.setTimeout(callback, delayMs);
  },
  clearTimeout(timerId) {
    if (timerId != null) {
      window.clearTimeout(timerId);
    }
  },
};
