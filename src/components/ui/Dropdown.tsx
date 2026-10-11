/* منوی کشویی (برای عملیات هر ردیف و منوی کاربر) */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useClickOutside } from '../../lib/hooks';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect: () => void;
}

export interface DropdownProps {
  items: DropdownItem[];
  label: string;
  icon?: IconName;
  trigger?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  buttonVariant?: 'ghost' | 'secondary';
}

export function Dropdown({
  items,
  label,
  icon = 'dots',
  trigger,
  align = 'end',
  className,
  buttonVariant = 'ghost',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className={cn('relative inline-flex', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          'btn btn-icon',
          buttonVariant === 'ghost' ? 'btn-ghost' : 'btn-secondary',
          open && 'bg-card-2 text-fg',
        )}
      >
        {trigger ?? <Icon name={icon} size={16} />}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            'animate-pop absolute top-full z-50 mt-1 min-w-48 overflow-hidden rounded-field border border-line bg-card p-1 shadow-soft',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {items.map((item) =>
            item.separator ? (
              <div key={item.id} className="my-1 h-px bg-line" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-start text-[12.5px] transition-colors disabled:opacity-40',
                  item.danger ? 'text-danger-fg hover:bg-danger-soft' : 'text-fg-muted hover:bg-card-2 hover:text-fg',
                )}
              >
                {item.icon ? <Icon name={item.icon} size={15} /> : null}
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
