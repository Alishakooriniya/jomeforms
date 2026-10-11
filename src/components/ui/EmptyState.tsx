/* حالت خالی و اسکلت بارگذاری */

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ title, description, icon = 'inbox', action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1.5 py-8' : 'gap-2.5 py-14',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card-2 text-fg-subtle">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-[13px] font-medium text-fg">{title}</p>
      {description ? <p className="max-w-md text-[11.5px] leading-5 text-fg-subtle">{description}</p> : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('skeleton block', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </div>
  );
}

/** اسکلت صفحه — به‌عنوان فالبک بارگذاری مسیرها (lazy) */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-52" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
