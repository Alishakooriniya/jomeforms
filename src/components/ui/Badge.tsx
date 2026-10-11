/* برچسب وضعیت */

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { displayDigits } from '../../lib/format';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import type { Tone } from '../../data/labels';

const TONE_CLASS: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-success-soft text-success-fg',
  warn: 'bg-warn-soft text-warn-fg',
  danger: 'bg-danger-soft text-danger-fg',
  info: 'bg-info-soft text-info-fg',
  neutral: 'border border-line bg-card-2 text-fg-muted',
};

const DOT_CLASS: Record<Tone, string> = {
  brand: 'bg-brand-500',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-fg-subtle',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  icon?: IconName;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, tone = 'neutral', icon, dot, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]',
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASS[tone])} /> : null}
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 12} /> : null}
      {children}
    </span>
  );
}

/** شمارنده کوچک برای تب‌ها و فهرست‌ها */
export function CountBadge({ value, tone = 'neutral' }: { value: number; tone?: Tone }) {
  return (
    <span
      className={cn(
        'num inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10.5px] font-medium',
        TONE_CLASS[tone],
      )}
    >
      {displayDigits(value)}
    </span>
  );
}
