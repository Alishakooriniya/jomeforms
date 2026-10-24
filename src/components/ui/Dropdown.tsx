/* منوی کشویی — برای عملیات هر ردیف و منوی کاربر.
   منو در portal رندر می‌شود تا اسکرول افقی جدول یا overflow کارت آن را نبُرد
   و همیشه داخل کادر دید قرار بگیرد. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* موقعیت منو بر پایه دکمه محاسبه و در کادر دید نگه داشته می‌شود */
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = triggerRef.current;
      const menu = menuRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = menu?.offsetWidth ?? 200;
      const height = menu?.offsetHeight ?? 0;
      const padding = 8;

      let left = align === 'end' ? rect.right - width : rect.left;
      left = Math.min(Math.max(padding, left), window.innerWidth - width - padding);

      let top = rect.bottom + 4;
      if (height && top + height > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - height - 4);
      }
      setPosition({ top, left });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, align, items.length]);

  /* بستن با کلیک بیرون یا Escape — دکمه و منو هر دو استثنا هستند */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setPosition(null);
  }, [open]);

  return (
    <div className={cn('relative inline-flex', className)} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          trigger
            ? 'inline-flex h-9 items-center justify-center rounded-btn px-1 transition-colors'
            : 'btn btn-icon',
          buttonVariant === 'ghost' ? 'btn-ghost' : 'btn-secondary',
          open && 'bg-card-2 text-fg',
        )}
      >
        {trigger ?? <Icon name={icon} size={16} />}
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: 'fixed',
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                minWidth: 192,
                visibility: position ? 'visible' : 'hidden',
              }}
              className="animate-pop z-[80] overflow-hidden rounded-field border border-line bg-card p-1 shadow-soft"
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
                      'flex w-full items-center gap-2 whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-start text-[12px] transition-colors disabled:opacity-40',
                      item.danger
                        ? 'text-danger-fg hover:bg-danger-soft'
                        : 'text-fg-muted hover:bg-card-2 hover:text-fg',
                    )}
                  >
                    {item.icon ? <Icon name={item.icon} size={15} /> : null}
                    {item.label}
                  </button>
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
