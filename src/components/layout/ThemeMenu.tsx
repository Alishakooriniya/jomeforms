/* انتخاب سریع پوسته: حالت روشن/تاریک/سیستم + رنگ برند + گردی گوشه‌ها */

import { useState } from 'react';
import { useRef } from 'react';
import { cn } from '../../lib/utils';
import { useClickOutside } from '../../lib/hooks';
import { useTheme } from '../../store/ThemeProvider';
import { THEME_ACCENTS, THEME_MODES, THEME_RADII } from '../../config/theme';
import { Icon } from '../ui/Icon';

export function ThemeMenu() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn('btn btn-ghost btn-icon', open && 'bg-card-2 text-fg')}
        aria-label="تغییر پوسته"
        title="پوسته"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon name={theme.isDark ? 'moon' : 'sun'} size={17} />
      </button>

      {open ? (
        <div className="animate-pop absolute end-0 top-full z-50 mt-1.5 w-64 rounded-card border border-line bg-card p-3 shadow-soft">
          <p className="mb-2 text-[11px] font-medium text-fg-muted">حالت نمایش</p>
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {THEME_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => theme.setMode(mode.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-field border px-2 py-2 text-[11.5px] transition-colors',
                  theme.mode === mode.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-200'
                    : 'border-line text-fg-muted hover:bg-card-2',
                )}
              >
                <Icon name={mode.icon} size={15} />
                {mode.label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] font-medium text-fg-muted">رنگ سازمانی</p>
          <div className="mb-3 flex items-center gap-2">
            {THEME_ACCENTS.map((accent) => (
              <button
                key={accent.value}
                type="button"
                onClick={() => theme.setAccent(accent.value)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-transform hover:scale-105',
                  theme.accent === accent.value ? 'border-fg' : 'border-transparent',
                )}
                style={{ background: accent.color }}
                aria-label={accent.hint}
                title={`${accent.label} — ${accent.hint}`}
              />
            ))}
          </div>

          <p className="mb-2 text-[11px] font-medium text-fg-muted">گردی گوشه‌ها</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_RADII.map((radius) => (
              <button
                key={radius.value}
                type="button"
                onClick={() => theme.setRadius(radius.value)}
                className={cn(
                  'rounded-field border px-2 py-1.5 text-[11.5px] transition-colors',
                  theme.radius === radius.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-200'
                    : 'border-line text-fg-muted hover:bg-card-2',
                )}
              >
                {radius.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
