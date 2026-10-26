/* محافظت از مسیرها و دکمه‌ها بر پایه دسترسی‌ها */

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { EmptyState } from './ui/EmptyState';
import { Button } from './ui/Button';

/** مسیرهای نیازمند ورود */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-sm text-fg-muted">در حال بارگذاری…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/** صفحه‌هایی که دسترسی لازم دارند */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) return <NoAccess />;
  return <>{children}</>;
}

export function RequireSuperadmin({ children }: { children: ReactNode }) {
  const { isSuperadmin } = useAuth();
  if (!isSuperadmin) return <NoAccess />;
  return <>{children}</>;
}

/** نمایش شرطی بخشی از رابط کاربری */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
}

export function NoAccess() {
  return (
    <div className="card">
      <EmptyState
        icon="lock"
        title="دسترسی به این بخش ندارید"
        description="برای دریافت دسترسی، از مدیر ارشد سامانه بخواهید این قسمت را برای شما فعال کند."
        action={<Button to="/" variant="soft" icon="dashboard">بازگشت به داشبورد</Button>}
      />
    </div>
  );
}
