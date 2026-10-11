/* کشوی کناری — برای منوی موبایل و پنل فیلترها */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'start' | 'end';
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** عرض پنل در دسکتاپ */
  widthClass?: string;
}

export function Drawer({ open, onClose, side = 'start', title, children, footer, widthClass = 'w-[290px]' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] lg:hidden">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'animate-rise absolute inset-y-0 flex max-w-[85vw] flex-col border-line bg-card shadow-lg',
          widthClass,
          side === 'start' ? 'start-0 border-e' : 'end-0 border-s',
        )}
      >
        {title ? (
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-fg-subtle hover:bg-card-2 hover:text-fg"
              aria-label="بستن"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="border-t border-line p-3">{footer}</div> : null}
      </aside>
    </div>
  );
}
