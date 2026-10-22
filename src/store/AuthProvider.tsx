/* احراز هویت.
   دو حالت دارد:
   - محلی (پیش‌فرض): کاربران داخل مرورگر بررسی می‌شوند و سامانه آفلاین کار می‌کند.
   - سروری: با `VITE_API_MODE=server` ورود/خروج و بازیابی نشست از API انجام می‌شود
     (توکن دسترسی در حافظه، نشست با کوکی HttpOnly تازه می‌شود). */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession, User } from '../types';
import { setCurrentActor, useDb, useDbActions } from './DataProvider';
import { verifyPassword } from '../lib/crypto';
import { normalizeText } from '../lib/utils';
import { KEYS, readJSON, removeItem, writeJSON } from '../lib/storage';
import { userCan } from '../data/permissions';
import { ApiError, authApi, isServerMode } from '../lib/apiClient';

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthApi {
  user: User | null;
  isSuperadmin: boolean;
  /** false while a server session is being restored after a page reload */
  ready: boolean;
  serverMode: boolean;
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
  const { users } = useDb();
  const { log, touchLogin } = useDbActions();
  const [session, setSession] = useState<AuthSession | null>(() =>
    readJSON<AuthSession | null>(KEYS.session, null),
  );
  const [serverUser, setServerUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!isServerMode);

  const user = useMemo(() => {
    if (isServerMode) return serverUser;
    if (!session) return null;
    return users.find((item) => item.id === session.userId && item.active) ?? null;
  }, [session, serverUser, users]);

  // بازیابی نشست سروری پس از بارگذاری صفحه (کوکی refresh)
  useEffect(() => {
    if (!isServerMode) return;
    let cancelled = false;
    authApi
      .restore()
      .then((restored) => {
        if (!cancelled) setServerUser(restored);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // اگر کاربر حذف یا غیرفعال شود، نشست محلی باطل می‌شود
  useEffect(() => {
    if (isServerMode || !session || user) return;
    removeItem(KEYS.session);
    setSession(null);
  }, [session, user]);

  useEffect(() => {
    setCurrentActor(user ? { id: user.id, name: user.fullName } : null);
  }, [user]);

  const login = useCallback<AuthApi['login']>(
    async (username, password) => {
      if (!username.trim() || !password) {
        return { ok: false, error: 'نام کاربری و رمز عبور را وارد کنید.' };
      }

      if (isServerMode) {
        try {
          const result = await authApi.login(username.trim(), password);
          setServerUser(result.user);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: authErrorMessage(error) };
        }
      }

      const needle = normalizeText(username);
      const found = users.find((item) => normalizeText(item.username) === needle);
      if (!found) return { ok: false, error: 'نام کاربری یا رمز عبور اشتباه است.' };
      if (!found.active) return { ok: false, error: 'این حساب غیرفعال است؛ با مدیر ارشد تماس بگیرید.' };
      if (!verifyPassword(password, found.passwordHash)) {
        return { ok: false, error: 'نام کاربری یا رمز عبور اشتباه است.' };
      }
      const next: AuthSession = { userId: found.id, loggedInAt: new Date().toISOString() };
      writeJSON(KEYS.session, next);
      setCurrentActor({ id: found.id, name: found.fullName });
      setSession(next);
      touchLogin(found.id);
      log({ action: 'ورود به سامانه', entity: 'auth', entityId: found.id, entityLabel: found.fullName });
      return { ok: true };
    },
    [users, log, touchLogin],
  );

  const logout = useCallback(async () => {
    if (isServerMode) {
      await authApi.logout().catch(() => undefined);
      setServerUser(null);
      return;
    }
    if (user) log({ action: 'خروج از سامانه', entity: 'auth', entityId: user.id, entityLabel: user.fullName });
    removeItem(KEYS.session);
    setSession(null);
    setCurrentActor(null);
  }, [user, log]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      isSuperadmin: user?.role === 'superadmin',
      ready,
      serverMode: isServerMode,
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
