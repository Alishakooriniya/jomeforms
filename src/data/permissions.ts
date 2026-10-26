/* کاتالوگ دسترسی‌ها — تنها منبع حقیقت برای مجوزها.
   هر صفحه/دکمه با کلیدهایی مثل `clients.create` محافظت می‌شود.
   نقش‌های آماده وجود ندارند؛ دسترسی هر کاربر جداگانه و سفارشی تعیین می‌شود. */

import type { RoleId } from '../types';

export interface PermissionDef {
  key: string;
  label: string;
  hint?: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  description: string;
  icon: string;
  perms: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    description: 'نمای کلی آمار و فعالیت‌ها',
    icon: 'dashboard',
    perms: [{ key: 'dashboard.view', label: 'مشاهده داشبورد' }],
  },
  {
    id: 'clients',
    label: 'پرونده‌ها',
    description: 'ثبت پرونده‌ها، مدیریت مراحل و بارگذاری مدارک',
    icon: 'users',
    perms: [
      { key: 'clients.view', label: 'مشاهده پرونده‌ها' },
      { key: 'clients.create', label: 'ایجاد پرونده' },
      { key: 'clients.edit', label: 'ویرایش پرونده' },
      { key: 'clients.workflow.advance', label: 'ثبت پیشرفت مراحل پرونده' },
      { key: 'clients.workflow.override', label: 'عبور مدیریتی از شرط مرحله' },
      { key: 'clients.delete', label: 'حذف پرونده' },
      { key: 'clients.export', label: 'خروجی گرفتن از پرونده‌ها' },
    ],
  },
  {
    id: 'documents',
    label: 'اسناد و فرم‌ها',
    description: 'تکمیل، چاپ و بارگذاری اسناد امضاشده',
    icon: 'file-text',
    perms: [
      { key: 'documents.view', label: 'مشاهده اسناد' },
      { key: 'documents.create', label: 'ایجاد سند از قالب' },
      { key: 'documents.edit', label: 'ویرایش سند' },
      { key: 'documents.delete', label: 'حذف سند' },
      { key: 'documents.print', label: 'چاپ و خروجی PDF' },
      { key: 'documents.export', label: 'خروجی فهرست اسناد (CSV)' },
      { key: 'documents.upload', label: 'بارگذاری اسکن امضاشده' },
      { key: 'documents.status', label: 'تغییر وضعیت سند' },
    ],
  },
  {
    id: 'templates',
    label: 'فرم‌ها',
    description: 'استفاده از فرم‌ها در اسناد و مدیریت آن‌ها',
    icon: 'template',
    perms: [
      { key: 'templates.view', label: 'استفاده از فرم‌ها در اسناد' },
      { key: 'templates.create', label: 'افزودن فرم' },
      { key: 'templates.edit', label: 'ویرایش فرم' },
      { key: 'templates.delete', label: 'حذف فرم' },
    ],
  },
  {
    id: 'companies',
    label: 'مجموعه‌ها',
    description: 'شرکت‌ها و مالکان زمین + اتصال کاربران به آن‌ها',
    icon: 'building',
    perms: [
      { key: 'companies.view', label: 'مشاهده مجموعه‌ها' },
      { key: 'companies.create', label: 'افزودن مجموعه' },
      { key: 'companies.edit', label: 'ویرایش مجموعه' },
      { key: 'companies.delete', label: 'حذف مجموعه' },
      { key: 'companies.assign', label: 'اتصال کاربران به مجموعه' },
    ],
  },
  {
    id: 'users',
    label: 'کاربران',
    description: 'مدیریت مدیران سامانه',
    icon: 'user-cog',
    perms: [
      { key: 'users.view', label: 'مشاهده کاربران' },
      { key: 'users.create', label: 'افزودن کاربر' },
      { key: 'users.edit', label: 'ویرایش کاربر و دسترسی‌ها' },
      { key: 'users.delete', label: 'حذف/غیرفعال‌کردن کاربر' },
    ],
  },
  {
    id: 'audit',
    label: 'گزارش فعالیت',
    description: 'ردیابی عملیات کاربران',
    icon: 'history',
    perms: [{ key: 'audit.view', label: 'مشاهده گزارش فعالیت' }],
  },
  {
    id: 'reminders',
    label: 'یادآورها',
    description: 'تعریف یادآور زمان‌دار برای کاربران سامانه',
    icon: 'bell',
    perms: [{ key: 'reminders.manage', label: 'مدیریت یادآورها' }],
  },
  {
    id: 'letterhead',
    label: 'سربرگ',
    description: 'نوشتن نامه روی سربرگ رسمی و چاپ آن؛ هر چاپ برای پیگیری ثبت می‌شود',
    icon: 'file',
    perms: [
      { key: 'letterhead.view', label: 'استفاده از سربرگ' },
      { key: 'letterhead.manage', label: 'مدیریت سربرگ و گزارش چاپ' },
    ],
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    description: 'پوسته، اطلاعات سازمان و داده‌ها',
    icon: 'settings',
    perms: [
      { key: 'settings.view', label: 'مشاهده تنظیمات' },
      { key: 'settings.edit', label: 'تغییر تنظیمات' },
    ],
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((group) => group.perms.map((p) => p.key));

export const PERMISSION_LABELS: Record<string, string> = PERMISSION_GROUPS.reduce<Record<string, string>>(
  (acc, group) => {
    group.perms.forEach((perm) => {
      acc[perm.key] = `${group.label} — ${perm.label}`;
    });
    return acc;
  },
  {},
);

/** بررسی دسترسی کاربر (سوپرادمین همه‌چیز دارد) */
export function userCan(user: { role: RoleId; permissions: string[] } | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(permission);
}

export function canAny(user: { role: RoleId; permissions: string[] } | null | undefined, permissions: string[]): boolean {
  return permissions.some((perm) => userCan(user, perm));
}

/** خلاصه‌ی متنی دسترسی‌های یک کاربر */
export function summarizePermissions(permissions: string[], isSuperadmin: boolean): string {
  if (isSuperadmin) return 'دسترسی کامل سامانه';
  if (!permissions.length) return 'بدون دسترسی';
  return `دسترسی به ${permissions.length} مورد از ${ALL_PERMISSIONS.length}`;
}

/** درخت دسترسی بر اساس گروه‌ها برای نمایش در قالب ماتریسی */
export function permissionGroupsFor(permissions: string[]): Array<{ id: string; label: string; granted: number; total: number }> {
  return PERMISSION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    granted: group.perms.filter((perm) => permissions.includes(perm.key)).length,
    total: group.perms.length,
  }));
}
