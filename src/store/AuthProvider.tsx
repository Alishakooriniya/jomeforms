/* احراز هویت — فقط از طریق API بک‌اند.
   ورود/خروج و بازیابی نشست با `authApi` انجام می‌شود (توکن دسترسی در حافظه،
   نشست با کوکی HttpOnly تازه می‌شود). داده‌ها پس از ورود با reload پر می‌شوند. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { userCan } from '../data/permissions';
import { ApiError, authApi } from '../lib/apiClient';
import { useDbActions } from './DataProvider';

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthApi {
  user: User | null;
  isSuperadmin: boolean;
  /** false while a server session is being restored after a page reload */
  ready: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthApi | null>(null);

/** پیام‌های سرور انگلیسی هستند؛ برای کاربر فارسی‌زبان ترجمه می‌شوند. */
function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'ارتباط با سرور برقرار نشد. اتصال شبکه را بررسی کنید.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { reload, reset } = useDbActions();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // بازیابی نشست سروری پس از بارگذاری صفحه (کوکی refresh)
  useEffect(() => {
    let cancelled = false;
    authApi
      .restore()
      .then((restored) => {
        if (!cancelled) setUser(restored);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // پس از ورود کاربر، داده‌ها را از سرور بخوان
  useEffect(() => {
    if (user) void reload();
  }, [user, reload]);

  const login = useCallback<AuthApi['login']>(
    async (username, password) => {
      if (!username.trim() || !password) {
        return { ok: false, error: 'نام کاربری و رمز عبور را وارد کنید.' };
      }
      try {
        const result = await authApi.login(username.trim(), password);
        setUser(result.user);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error) };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
    reset();
  }, [reset]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      isSuperadmin: user?.role === 'superadmin',
      ready,
      login,
      logout,
      can: (permission) => userCan(user, permission),
      canAny: (permissions) => permissions.some((permission) => userCan(user, permission)),
    }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth باید داخل AuthProvider استفاده شود.');
  return value;
}
