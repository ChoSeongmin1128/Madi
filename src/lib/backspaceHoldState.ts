const HOLD_PAUSE_MS = 400;

let hasCrossedBoundary = false;
let boundaryTimer: number | null = null;

export function scheduleBlockDeletion(onDelete: () => void) {
  if (boundaryTimer !== null) return;
  boundaryTimer = window.setTimeout(() => {
    boundaryTimer = null;
    hasCrossedBoundary = true;
    onDelete();
  }, HOLD_PAUSE_MS);
}

export function canSkipPause() {
  return hasCrossedBoundary;
}

export function resetHoldState() {
  if (boundaryTimer !== null) {
    clearTimeout(boundaryTimer);
    boundaryTimer = null;
  }
  hasCrossedBoundary = false;
}
