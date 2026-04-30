import { listen as tauriListen } from '@tauri-apps/api/event';
import { isTauriRuntime } from './runtimeEnv';

interface EventPayload<T> {
  payload: T;
}

export async function listenToTauriEvent<T>(
  eventName: string,
  handler: (event: EventPayload<T>) => void,
) {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return tauriListen<T>(eventName, handler);
}
