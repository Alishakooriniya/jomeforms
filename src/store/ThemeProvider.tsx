/* پوسته: فقط حالت روشن/تاریک.
   با کلاس dark روی <html> اعمال می‌شود تا با CSS Variable
   بدون رندر مجدد کامپوننت‌ها تغییر کند. */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode, ThemePrefs } from '../types';
import { isThemeMode } from '../config/theme';
import { KEYS, readJSON, writeJSON } from '../lib/storage';

interface ThemeApi {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeApi | null>(null);

const DEFAULT_MODE: ThemeMode = 'light';

/** مقدار ذخیره‌شده ممکن است از نسخه قدیمی (system یا فیلدهای حذف‌شده) بیاید */
function readMode(): ThemeMode {
  const stored = readJSON<Partial<ThemePrefs>>(KEYS.theme, {});
  return isThemeMode(stored.mode) ? stored.mode : DEFAULT_MODE;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const isDark = mode === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    writeJSON(KEYS.theme, { mode } satisfies ThemePrefs);
  }, [isDark, mode]);

  const api = useMemo<ThemeApi>(
    () => ({
      mode,
      isDark,
      setMode,
      toggleMode: () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [mode, isDark],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme باید داخل ThemeProvider استفاده شود.');
  return value;
}
