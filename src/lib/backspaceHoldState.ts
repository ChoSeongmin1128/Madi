const HOLD_PAUSE_MS = 400;

let boundaryTimer: number | null = null;

export function scheduleBlockDeletion(onDelete: () => void) {
  if (boundaryTimer !== null) return;
  boundaryTimer = window.setTimeout(() => {
    boundaryTimer = null;
    onDelete();
  }, HOLD_PAUSE_MS);
}

export function resetHoldState() {
  if (boundaryTimer !== null) {
    clearTimeout(boundaryTimer);
    boundaryTimer = null;
  }
}
