/* پنجره گفت‌وگو (Modal) و تأییدیه — سبک، بدون کتابخانه */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import type { ButtonVariant } from './Button';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  size?: ModalSize;
  footer?: ReactNode;
  children?: ReactNode;
  bodyClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  size = 'md',
  footer,
  children,
  bodyClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), textarea, select, button',
      );
      focusable?.focus();
    }, 40);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
      <div
        className="animate-fade-in fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn('animate-pop card relative my-auto w-full shadow-lg', SIZE_CLASS[size])}
      >
        {title ? (
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-start gap-2.5">
              {icon ? (
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-field bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300">
                  <Icon name={icon} size={16} />
                </span>
              ) : null}
              <div>
                <h2 className="text-sm font-semibold text-fg">{title}</h2>
                {description ? <p className="mt-0.5 text-[11.5px] leading-5 text-fg-muted">{description}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-card-2 hover:text-fg"
              aria-label="بستن"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : null}

        <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'تأیید و ادامه',
  cancelLabel = 'انصراف',
  variant = 'primary',
  icon = 'alert',
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[13px] leading-6 text-fg-muted">{description}</div>
    </Modal>
  );
}
