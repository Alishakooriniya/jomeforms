/* دکمه پایه — همه دکمه‌های برنامه از این کامپوننت ساخته می‌شوند. */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  soft: 'btn-soft',
  danger: 'btn-danger',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

function Spinner({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  /** اگر مقدار داشته باشد، دکمه به‌صورت لینک رندر می‌شود */
  to?: string;
  fullWidth?: boolean;
  /** برچسب دسترس‌پذیری برای دکمه‌های فقط-آیکون */
  label?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  to,
  fullWidth,
  className,
  children,
  label,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = cn(
    'btn',
    SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    fullWidth && 'w-full',
    !children && size !== 'icon' && 'px-3',
    className,
  );
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const content = (
    <>
      {loading ? <Spinner size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} /> : null}
    </>
  );

  const a11y = label ? { 'aria-label': label, title: label } : {};

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className={classes} {...a11y} {...(rest as Record<string, unknown>)}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...a11y} {...rest}>
      {content}
    </button>
  );
}

/** دکمه فقط-آیکون با برچسب دسترس‌پذیری */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  className,
  ...rest
}: Omit<ButtonProps, 'size' | 'children' | 'icon'> & { icon: IconName; label: string }) {
  return (
    <Button
      variant={variant}
      size="icon"
      icon={icon}
      aria-label={label}
      title={label}
      className={className}
      {...rest}
    />
  );
}
