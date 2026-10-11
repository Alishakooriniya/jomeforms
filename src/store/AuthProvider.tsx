/* احراز هویت سمت کلاینت.
   ⚠️ در بک‌اند واقعی، ورود با توکن سمت سرور انجام می‌شود و این فایل
   به یک فراخوانی API تبدیل خواهد شد (src/lib/api.ts). */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession, User } from '../types';
import { setCurrentActor, useDb, useDbActions } from './DataProvider';
import { verifyPassword } from '../lib/crypto';
import { normalizeText } from '../lib/utils';
import { KEYS, readJSON, removeItem, writeJSON } from '../lib/storage';
import { userCan } from '../data/permissions';

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthApi {
  user: User | null;
  isSuperadmin: boolean;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { users } = useDb();
  const { log, touchLogin } = useDbActions();
  const [session, setSession] = useState<AuthSession | null>(() => readJSON<AuthSession | null>(KEYS.session, null));

  const user = useMemo(() => {
    if (!session) return null;
    return users.find((item) => item.id === session.userId && item.active) ?? null;
  }, [session, users]);

  // اگر کاربر حذف یا غیرفعال شود، نشست باطل می‌شود
  useEffect(() => {
    if (session && !user) {
      removeItem(KEYS.session);
      setSession(null);
    }
  }, [session, user]);

  useEffect(() => {
    setCurrentActor(user ? { id: user.id, name: user.fullName } : null);
  }, [user]);

  const login = useCallback<AuthApi['login']>(
    (username, password) => {
      const needle = normalizeText(username);
      if (!needle || !password) return { ok: false, error: 'نام کاربری و رمز عبور را وارد کنید.' };
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

  const logout = useCallback(() => {
    if (user) log({ action: 'خروج از سامانه', entity: 'auth', entityId: user.id, entityLabel: user.fullName });
    removeItem(KEYS.session);
    setSession(null);
    setCurrentActor(null);
  }, [user, log]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      isSuperadmin: user?.role === 'superadmin',
      login,
      logout,
      can: (permission) => userCan(user, permission),
      canAny: (permissions) => permissions.some((permission) => userCan(user, permission)),
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth باید داخل AuthProvider استفاده شود.');
  return value;
}
