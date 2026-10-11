/* پیام‌های کوتاه (Toast) — سبک و بدون کتابخانه */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';
import type { IconName } from '../components/ui/Icon';

type ToastTone = 'success' | 'error' | 'info' | 'warn';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
}

interface ToastApi {
  toast: (tone: ToastTone, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warn: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<ToastTone, { icon: IconName; className: string }> = {
  success: { icon: 'check', className: 'text-success-fg bg-success-soft' },
  error: { icon: 'alert', className: 'text-danger-fg bg-danger-soft' },
  warn: { icon: 'alert', className: 'text-warn-fg bg-warn-soft' },
  info: { icon: 'info', className: 'text-info-fg bg-info-soft' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const push = (tone: ToastTone, message: string, description?: string) => {
      counter.current += 1;
      const id = counter.current;
      setItems((prev) => [...prev.slice(-3), { id, tone, message, description }]);
      setTimeout(() => remove(id), tone === 'error' ? 6000 : 4000);
    };
    return {
      toast: push,
      success: (message, description) => push('success', message, description),
      error: (message, description) => push('error', message, description),
      info: (message, description) => push('info', message, description),
      warn: (message, description) => push('warn', message, description),
    };
  }, [remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => {
          const style = TONE_STYLE[item.tone];
          return (
            <div
              key={item.id}
              role="status"
              className="animate-rise pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-card p-3 shadow-soft"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                <Icon name={style.icon} size={15} bold />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">{item.message}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-5 text-fg-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="rounded-md p-1 text-fg-subtle transition-colors hover:bg-card-2 hover:text-fg"
                aria-label="بستن پیام"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast باید داخل ToastProvider استفاده شود.');
  return value;
}
