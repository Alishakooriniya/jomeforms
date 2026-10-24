/* منوی کناری — ناوبری اصلی و مدیریت.
   بخش «مدیریت» به‌صورت تاشو نمایش داده می‌شود تا تمرکز روی کارهای روزمره بماند
   و در صورت باز بودن یکی از صفحه‌های مدیریت، خودکار باز می‌شود. */

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/AuthProvider';
import { useDb } from '../../store/DataProvider';
import { NAV_ITEMS } from '../../config/navigation';
import { ROLE_LABELS } from '../../data/labels';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export function Sidebar({ onNavigate, showBrand = true }: { onNavigate?: () => void; showBrand?: boolean }) {
  const { user, can, logout, serverMode } = useAuth();
  const { settings } = useDb();
  const location = useLocation();
  const visibleItems = NAV_ITEMS.filter(
    (item) => can(item.permission) && (item.to !== '/admin-users' || serverMode),
  );
  const mainItems = visibleItems.filter((item) => item.section === 'اصلی');
  const adminItems = visibleItems.filter((item) => item.section === 'مدیریت');
  const adminActive = adminItems.some((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));
  const [adminOpen, setAdminOpen] = useState(adminActive);

  useEffect(() => {
    if (adminActive) setAdminOpen(true);
  }, [adminActive]);

  if (!user) return null;

  const itemClass = (isActive: boolean) =>
    cn(
      'flex h-9 items-center gap-2.5 rounded-btn px-2.5 text-[13px] transition-colors',
      isActive
        ? 'bg-card-2 font-medium text-fg'
        : 'text-fg-muted hover:bg-card-2/70 hover:text-fg',
    );

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => (
    <li key={item.to}>
      <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
        {({ isActive }) => (
          <>
            <Icon
              name={item.icon}
              size={15}
              bold={isActive}
              className={isActive ? 'text-brand-600 dark:text-brand-300' : undefined}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> : null}
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <div className="flex h-full flex-col bg-card">
      {/* برند */}
      {showBrand ? (
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-brand-600 text-white">
            <Icon name="building" size={16} bold />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-fg">{settings.orgName || 'سامانه املاک'}</p>
            <p className="truncate text-[10.5px] text-fg-subtle">مدیریت پرونده و اسناد</p>
          </div>
        </div>
      ) : null}

      {/* منو */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="منوی اصلی">
        <ul className="flex flex-col gap-0.5">{mainItems.map(renderItem)}</ul>

        {adminItems.length ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAdminOpen((prev) => !prev)}
              aria-expanded={adminOpen}
              className="flex h-8 w-full items-center gap-1.5 rounded-btn px-2 text-[10.5px] font-medium text-fg-subtle transition-colors hover:text-fg"
            >
              <span className="flex-1 text-start">مدیریت</span>
              <Icon name="chevron-down" size={12} className={cn('transition-transform', !adminOpen && 'rotate-90')} />
            </button>
            {adminOpen ? <ul className="mt-0.5 flex flex-col gap-0.5">{adminItems.map(renderItem)}</ul> : null}
          </div>
        ) : null}
      </nav>

      {/* کاربر */}
      <div className="border-t border-line p-2.5">
        <div className="flex items-center gap-2">
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-btn px-1.5 py-1.5 transition-colors hover:bg-card-2"
            aria-label="پروفایل کاربر"
          >
            <Avatar name={user.fullName} size={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-fg">{user.fullName}</span>
              <span className="block truncate text-[10.5px] text-fg-subtle">
                {ROLE_LABELS[user.role]}
                {user.title ? ` • ${user.title}` : ''}
              </span>
            </span>
          </NavLink>
          <Button variant="ghost" size="icon" icon="logout" label="خروج از حساب" onClick={logout} />
        </div>
      </div>
    </div>
  );
}
