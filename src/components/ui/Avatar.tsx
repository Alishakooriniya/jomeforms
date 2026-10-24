/* آواتار حرف‌اول و سرصفحه صفحه */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/* فقط سبز و خاکستری — هم‌خوان با پالت سامانه */
const AVATAR_TONES = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200',
  'bg-info-soft text-info-fg',
  'bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300',
  'border border-line bg-card-2 text-fg-muted',
];

export interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 34, className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) % 997;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-medium',
        AVATAR_TONES[hash % AVATAR_TONES.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials || '؟'}
    </span>
  );
}

export interface Breadcrumb {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, className }: PageHeaderProps) {
  /* مسیر (breadcrumb) فقط برای صفحه‌های عمیق‌تر از یک سطح نمایش داده می‌شود؛
     صفحه‌های اصلی فهرست به مسیر اضافی نیاز ندارند. */
  const crumbs = breadcrumbs && breadcrumbs.length > 2 ? breadcrumbs : null;

  return (
    <header className={cn('flex flex-col gap-2', className)}>
      {crumbs ? (
        <nav aria-label="مسیر" className="flex flex-wrap items-center gap-1 text-[11px] text-fg-subtle">
          {crumbs.slice(0, -1).map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-fg">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              <Icon name="chevron-left" size={11} />
            </span>
          ))}
          <span className="text-fg-muted">{crumbs[crumbs.length - 1]?.label}</span>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[21px] font-semibold leading-tight tracking-tight text-fg">{title}</h1>
          {subtitle ? <div className="mt-1 text-[12.5px] leading-6 text-fg-muted">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
