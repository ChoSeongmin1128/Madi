const LINKIFY_DUPLICATE_PROTOCOL_WARNING =
  'linkifyjs: already initialized - will not register custom scheme "';
const LINKIFY_REGISTRATION_ADVICE =
  'Register all schemes and plugins before invoking linkify the first time.';

declare global {
  interface Window {
    __madiConsoleWarningFilterInstalled?: boolean;
  }
}

export function shouldSuppressConsoleWarning(args: readonly unknown[]) {
  const [message] = args;

  return (
    typeof message === 'string' &&
    message.startsWith(LINKIFY_DUPLICATE_PROTOCOL_WARNING) &&
    message.includes(LINKIFY_REGISTRATION_ADVICE)
  );
}

export function installDevelopmentConsoleWarningFilter() {
  if (!import.meta.env.DEV || typeof window === 'undefined' || window.__madiConsoleWarningFilterInstalled) {
    return;
  }

  window.__madiConsoleWarningFilterInstalled = true;
  const originalWarn = console.warn.bind(console);

  console.warn = (...args: unknown[]) => {
    if (shouldSuppressConsoleWarning(args)) {
      return;
    }

    originalWarn(...args);
  };
}
