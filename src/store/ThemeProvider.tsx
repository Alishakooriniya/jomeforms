/* پوسته: حالت روشن/تاریک/سیستم + رنگ برند + گردی گوشه‌ها.
   همه با data-attribute روی <html> اعمال می‌شود تا با CSS Variable
   بدون رندر مجدد کامپوننت‌ها تغییر کند. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeAccent, ThemeMode, ThemePrefs, ThemeRadius } from '../types';
import { isThemeAccent, isThemeMode, isThemeRadius } from '../config/theme';
import { KEYS, readJSON, writeJSON } from '../lib/storage';

interface ThemeApi extends ThemePrefs {
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  setRadius: (radius: ThemeRadius) => void;
  toggleMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeApi | null>(null);

const DEFAULT_PREFS: ThemePrefs = { mode: 'system', accent: 'green', radius: 'md' };

/** مقدارهای ذخیره‌شده ممکن است از نسخه قدیمی یا ویرایش دستی localStorage بیایند */
function readPrefs(): ThemePrefs {
  const stored = readJSON<Partial<ThemePrefs>>(KEYS.theme, {});
  return {
    mode: isThemeMode(stored.mode) ? stored.mode : DEFAULT_PREFS.mode,
    accent: isThemeAccent(stored.accent) ? stored.accent : DEFAULT_PREFS.accent,
    radius: isThemeRadius(stored.radius) ? stored.radius : DEFAULT_PREFS.radius,
  };
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(readPrefs);
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  // پیگیری تغییر تم سیستم
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  const isDark = prefs.mode === 'dark' || (prefs.mode === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.accent = prefs.accent;
    root.dataset.radius = prefs.radius;
    writeJSON(KEYS.theme, prefs);
  }, [isDark, prefs]);

  const update = useCallback((patch: Partial<ThemePrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const api = useMemo<ThemeApi>(
    () => ({
      ...prefs,
      isDark,
      setMode: (mode) => update({ mode }),
      setAccent: (accent) => update({ accent }),
      setRadius: (radius) => update({ radius }),
      toggleMode: () => update({ mode: isDark ? 'light' : 'dark' }),
    }),
    [prefs, isDark, update],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme باید داخل ThemeProvider استفاده شود.');
  return value;
}
