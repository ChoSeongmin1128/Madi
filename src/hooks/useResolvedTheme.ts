import { useEffect, useState } from 'react';
import type { ThemeMode } from '../lib/types';

export function useResolvedTheme(themeMode: ThemeMode) {
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;
}
