/* منوی کناری (در موبایل به‌صورت کشو نمایش داده می‌شود) */

import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/AuthProvider';
import { useDb } from '../../store/DataProvider';
import { NAV_ITEMS, NAV_SECTIONS } from '../../config/navigation';
import { ROLE_LABELS } from '../../data/labels';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, can, logout } = useAuth();
  const { settings } = useDb();
  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <div className="flex h-full flex-col bg-card">
      {/* برند */}
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-card bg-brand-600 text-white">
          <Icon name="building" size={18} bold />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-fg">{settings.orgName}</p>
          <p className="truncate text-[10.5px] text-fg-subtle">سامانه پرونده و فرم</p>
        </div>
      </div>

      {/* منو */}
      <nav className="flex-1 overflow-y-auto p-2.5" aria-label="منوی اصلی">
        {NAV_SECTIONS.map((section) => {
          const items = visibleItems.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div key={section} className="mb-3">
              <p className="px-2.5 pb-1.5 text-[10.5px] font-medium text-fg-subtle">{section}</p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-btn px-2.5 py-2 text-[12.5px] transition-colors',
                          isActive
                            ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/12 dark:text-brand-200'
                            : 'text-fg-muted hover:bg-card-2 hover:text-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon name={item.icon} size={16} bold={isActive} />
                          <span className="flex-1">{item.label}</span>
                          {isActive ? <span className="h-4 w-1 rounded-full bg-brand-500" /> : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* کاربر */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.fullName} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-fg">{user.fullName}</p>
            <p className="truncate text-[10.5px] text-fg-subtle">
              {ROLE_LABELS[user.role]}
              {user.title ? ` — ${user.title}` : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            icon="logout"
            label="خروج از حساب"
            onClick={logout}
          />
        </div>
      </div>
    </div>
  );
}
