export const APP_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const APP_UPDATE_CHECK_TIMEOUT_MS = 15 * 1000;
export const APP_UPDATE_DOWNLOAD_TIMEOUT_MS = 30 * 1000;
export const APP_UPDATE_INSTALL_TIMEOUT_MS = 30 * 1000;

export type PreparedUpdateAction = (() => Promise<void>) | null;
export type DownloadProgressEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' };

export type DownloadedUpdate = {
  version: string;
  download: (onEvent?: (event: DownloadProgressEvent) => void) => Promise<void>;
  install: () => Promise<void>;
  close?: () => Promise<void>;
};

const isDev = import.meta.env.DEV;

export function debugUpdater(message: string, payload?: unknown) {
  if (!isDev) {
    return;
  }

  if (payload === undefined) {
    console.info(`[updater] ${message}`);
    return;
  }

  console.info(`[updater] ${message}`, payload);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
