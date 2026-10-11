/* کاتالوگ دسترسی‌ها — تنها منبع حقیقت برای مجوزها.
   هر صفحه/دکمه با کلیدهایی مثل `clients.create` محافظت می‌شود. */

import type { PermissionRole, RoleId } from '../types';
import { nowISO } from '../lib/format';

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
    description: 'اطلاعات مشتریان و ملک',
    icon: 'users',
    perms: [
      { key: 'clients.view', label: 'مشاهده پرونده‌ها' },
      { key: 'clients.create', label: 'ایجاد پرونده' },
      { key: 'clients.edit', label: 'ویرایش پرونده' },
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
    label: 'قالب فرم‌ها',
    description: 'ساخت و ویرایش فرم‌های قابل استفاده',
    icon: 'template',
    perms: [
      { key: 'templates.view', label: 'مشاهده قالب‌ها' },
      { key: 'templates.create', label: 'افزودن قالب فرم' },
      { key: 'templates.edit', label: 'ویرایش قالب' },
      { key: 'templates.delete', label: 'حذف قالب' },
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
    id: 'roles',
    label: 'نقش‌ها',
    description: 'بسته‌های دسترسی قابل استفاده مجدد',
    icon: 'shield',
    perms: [
      { key: 'roles.view', label: 'مشاهده نقش‌ها' },
      { key: 'roles.manage', label: 'ساخت و ویرایش نقش' },
    ],
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    description: 'تحلیل عملکرد و خروجی گزارش',
    icon: 'chart',
    perms: [
      { key: 'reports.view', label: 'مشاهده گزارش‌ها' },
      { key: 'reports.export', label: 'خروجی CSV گزارش' },
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

export const ROLE_LABELS: Record<RoleId, string> = {
  superadmin: 'مدیر ارشد',
  admin: 'مدیر',
};

/* --------------------------- نقش‌های آماده ---------------------------- */

function range(...keys: string[]): string[] {
  return keys;
}

export const PRESET_ROLES: PermissionRole[] = [
  {
    id: 'preset-viewer',
    name: 'فقط‌خواندنی',
    description: 'مشاهده پرونده‌ها و اسناد بدون امکان تغییر',
    permissions: range('dashboard.view', 'clients.view', 'documents.view', 'templates.view', 'companies.view', 'reports.view'),
    system: true,
    createdAt: nowISO(),
    createdBy: 'system',
  },
  {
    id: 'preset-operator',
    name: 'کارشناس پرونده',
    description: 'ثبت پرونده، تکمیل و چاپ اسناد و بارگذاری اسکن',
    permissions: range(
      'dashboard.view',
      'clients.view',
      'clients.create',
      'clients.edit',
      'documents.view',
      'documents.create',
      'documents.edit',
      'documents.print',
      'documents.export',
      'documents.upload',
      'documents.status',
      'templates.view',
      'companies.view',
      'companies.assign',
      'reports.view',
    ),
    system: true,
    createdAt: nowISO(),
    createdBy: 'system',
  },
  {
    id: 'preset-contracts',
    name: 'کارشناس قرارداد',
    description: 'تمرکز روی اسناد، چاپ، امضا و بایگانی اسکن‌ها',
    permissions: range(
      'dashboard.view',
      'clients.view',
      'documents.view',
      'documents.create',
      'documents.edit',
      'documents.print',
      'documents.export',
      'documents.upload',
      'documents.status',
      'templates.view',
      'companies.view',
      'companies.assign',
      'reports.view',
      'reports.export',
    ),
    system: true,
    createdAt: nowISO(),
    createdBy: 'system',
  },
  {
    id: 'preset-manager',
    name: 'مدیر شعبه',
    description: 'دسترسی کامل به پرونده‌ها، اسناد، گزارش‌ها و قالب‌ها',
    permissions: ALL_PERMISSIONS.filter(
      (key) => !key.startsWith('users.') && !key.startsWith('roles.') && key !== 'settings.edit',
    ),
    system: true,
    createdAt: nowISO(),
    createdBy: 'system',
  },
];

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
