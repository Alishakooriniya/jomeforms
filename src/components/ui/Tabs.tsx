/* تب‌ها — برای صفحات جزئیات و دسته‌بندی فهرست‌ها */

import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { CountBadge } from './Badge';

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative -mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12.5px] transition-colors',
              active
                ? 'border-brand-600 font-medium text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {item.icon ? <Icon name={item.icon} size={14} /> : null}
            {item.label}
            {item.count !== undefined ? (
              <CountBadge value={item.count} tone={active ? 'brand' : 'neutral'} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
