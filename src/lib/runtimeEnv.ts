declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

export function isBrowserPreviewRuntime() {
  return !isTauriRuntime() && import.meta.env.MODE !== 'test';
}
