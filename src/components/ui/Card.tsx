/* کارت‌ها و بلوک‌های نمایش اطلاعات */

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import type { Tone } from '../../data/labels';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, icon, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-line px-4 py-3', className)}>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-field bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300">
            <Icon name={icon} size={16} />
          </span>
        ) : null}
        <div>
          <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
          {subtitle ? <p className="text-[11px] text-fg-subtle">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

const TONE_CLASS: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-success-soft text-success-fg',
  warn: 'bg-warn-soft text-warn-fg',
  danger: 'bg-danger-soft text-danger-fg',
  info: 'bg-info-soft text-info-fg',
  neutral: 'bg-card-2 text-fg-muted',
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: IconName;
  tone?: Tone;
  onClick?: () => void;
}

export function StatCard({ label, value, hint, icon, tone = 'brand', onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        'card flex items-start justify-between gap-3 p-4',
        onClick && 'cursor-pointer transition-colors hover:border-line-strong hover:bg-card-2',
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => event.key === 'Enter' && onClick() : undefined}
    >
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="num mt-1.5 text-xl font-semibold text-fg">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-fg-subtle">{hint}</p> : null}
      </div>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-field', TONE_CLASS[tone])}>
        <Icon name={icon} size={18} />
      </span>
    </div>
  );
}

export interface InfoItem {
  label: string;
  value: ReactNode;
  icon?: IconName;
}

/** نمایش جفت‌های برچسب/مقدار (مشخصات پرونده، مالک و ...) */
export function InfoList({ items, columns = 2, className }: { items: InfoItem[]; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5 border-b border-line/70 pb-2">
          <dt className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
            {item.icon ? <Icon name={item.icon} size={13} /> : null}
            {item.label}
          </dt>
          <dd className="truncate text-[13px] text-fg">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** عنوان بخش داخل صفحه‌ها */
export function SectionTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-fg-subtle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
