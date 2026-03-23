export interface SchedulerPort {
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(timerId: number | null): void;
}
