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
    <div className={cn('flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon ? <Icon name={icon} size={14} className="shrink-0 text-fg-subtle" /> : null}
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-fg">{title}</h3>
          {subtitle ? <p className="truncate text-[11.5px] text-fg-subtle">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-brand-600 dark:text-brand-300',
  success: 'text-success',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-fg-subtle',
  neutral: 'text-fg-subtle',
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
        'card flex min-w-0 flex-col gap-1 p-3.5',
        onClick && 'cursor-pointer transition-colors hover:border-line-strong hover:bg-card-2/60',
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <p className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
        <Icon name={icon} size={13} className={TONE_TEXT[tone]} />
        <span className="truncate">{label}</span>
      </p>
      <p className="num text-[22px] font-semibold leading-8 tracking-tight text-fg">{value}</p>
      {hint ? <p className="truncate text-[11px] text-fg-subtle">{hint}</p> : null}
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
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
            {item.icon ? <Icon name={item.icon} size={12} /> : null}
            {item.label}
          </dt>
          <dd className="truncate text-[12.5px] text-fg" title={typeof item.value === 'string' ? item.value : undefined}>
            {item.value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** عنوان بخش داخل صفحه‌ها */
export function SectionTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[12.5px] font-semibold text-fg">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-fg-subtle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  /** برچسب دسترس‌پذیری */
  label?: string;
}

/** نوار پیشرفت باریک — پیشرفت مراحل پرونده و نرخ‌ها */
export function Progress({ value, max = 100, tone = 'brand', className, label }: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span
      className={cn('block h-1.5 w-full overflow-hidden rounded-full bg-card-2', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span
        className={cn(
          'block h-full rounded-full transition-[width] duration-300',
          tone === 'success' ? 'bg-success' : tone === 'warn' ? 'bg-warn' : tone === 'danger' ? 'bg-danger' : 'bg-brand-500',
        )}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
