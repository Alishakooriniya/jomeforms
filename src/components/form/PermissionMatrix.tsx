/* ماتریس دسترسی‌ها — سوپرادمین با همین کامپوننت دسترسی هر مدیر را تعیین می‌کند. */

import { useMemo } from 'react';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '../../data/permissions';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

export interface PermissionMatrixProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  /** نمایش دکمه‌های انتخاب سریع */
  showQuickActions?: boolean;
}

export function PermissionMatrix({ value, onChange, disabled, showQuickActions = true }: PermissionMatrixProps) {
  const granted = useMemo(() => new Set(value), [value]);

  const togglePermission = (key: string, checked: boolean) => {
    const next = new Set(granted);
    if (checked) next.add(key);
    else next.delete(key);
    onChange(ALL_PERMISSIONS.filter((permission) => next.has(permission)));
  };

  const toggleGroup = (groupId: string, checked: boolean) => {
    const group = PERMISSION_GROUPS.find((item) => item.id === groupId);
    if (!group) return;
    const next = new Set(granted);
    group.perms.forEach((permission) => {
      if (checked) next.add(permission.key);
      else next.delete(permission.key);
    });
    onChange(ALL_PERMISSIONS.filter((permission) => next.has(permission)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-field bg-card-2 px-3 py-2">
        <p className="num text-[11.5px] text-fg-muted">
          {granted.size} مورد از {ALL_PERMISSIONS.length} دسترسی فعال است
        </p>
        {showQuickActions ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              icon="check"
              disabled={disabled}
              onClick={() => onChange([...ALL_PERMISSIONS])}
            >
              انتخاب همه
            </Button>
            <Button size="sm" variant="ghost" icon="close" disabled={disabled} onClick={() => onChange([])}>
              پاک‌کردن
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
        {PERMISSION_GROUPS.map((group) => {
          const groupKeys = group.perms.map((permission) => permission.key);
          const grantedCount = groupKeys.filter((key) => granted.has(key)).length;
          const allGranted = grantedCount === groupKeys.length;

          return (
            <section key={group.id} className="rounded-card border border-line">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-card-2/60 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-field',
                      grantedCount
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300'
                        : 'bg-card text-fg-subtle',
                    )}
                  >
                    <Icon name={group.icon as IconName} size={15} />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-fg">{group.label}</p>
                    <p className="text-[10.5px] text-fg-subtle">{group.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={grantedCount ? 'brand' : 'neutral'} size="sm">
                    {grantedCount}/{groupKeys.length}
                  </Badge>
                  <Checkbox
                    checked={allGranted}
                    disabled={disabled}
                    aria-label={`انتخاب همه دسترسی‌های ${group.label}`}
                    onChange={(event) => toggleGroup(group.id, event.target.checked)}
                  />
                </div>
              </div>

              <div className="grid gap-x-4 gap-y-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.perms.map((permission) => (
                  <Checkbox
                    key={permission.key}
                    label={permission.label}
                    hint={permission.hint}
                    checked={granted.has(permission.key)}
                    disabled={disabled}
                    onChange={(event) => togglePermission(permission.key, event.target.checked)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
