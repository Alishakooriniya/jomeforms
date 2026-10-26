/**
 * Single source of truth for permissions on the server.
 * Keys and groups mirror `src/data/permissions.ts` in the frontend.
 */

export interface PermissionDefinition {
  key: string;
  group: string;
  label: string;
}

interface PermissionGroupDefinition {
  id: string;
  label: string;
  permissions: Array<{ key: string; label: string }>;
}

const GROUPS: PermissionGroupDefinition[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    permissions: [{ key: 'dashboard.view', label: 'مشاهده داشبورد' }],
  },
  {
    id: 'clients',
    label: 'پرونده‌ها',
    permissions: [
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
    permissions: [
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
    permissions: [
      { key: 'templates.view', label: 'استفاده از فرم‌ها در اسناد' },
      { key: 'templates.create', label: 'افزودن فرم' },
      { key: 'templates.edit', label: 'ویرایش فرم' },
      { key: 'templates.delete', label: 'حذف فرم' },
    ],
  },
  {
    id: 'companies',
    label: 'مجموعه‌ها',
    permissions: [
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
    permissions: [
      { key: 'users.view', label: 'مشاهده کاربران' },
      { key: 'users.create', label: 'افزودن کاربر' },
      { key: 'users.edit', label: 'ویرایش کاربر و دسترسی‌ها' },
      { key: 'users.delete', label: 'حذف/غیرفعال‌کردن کاربر' },
    ],
  },
  {
    id: 'audit',
    label: 'گزارش فعالیت',
    permissions: [{ key: 'audit.view', label: 'مشاهده گزارش فعالیت' }],
  },
  {
    id: 'reminders',
    label: 'یادآورها',
    permissions: [{ key: 'reminders.manage', label: 'مدیریت یادآورها' }],
  },
  {
    id: 'letterhead',
    label: 'سربرگ',
    permissions: [
      { key: 'letterhead.view', label: 'استفاده از سربرگ' },
      { key: 'letterhead.manage', label: 'مدیریت سربرگ و گزارش چاپ' },
    ],
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    permissions: [
      { key: 'settings.view', label: 'مشاهده تنظیمات' },
      { key: 'settings.edit', label: 'تغییر تنظیمات' },
    ],
  },
];

export const PERMISSION_CATALOG: PermissionDefinition[] = GROUPS.flatMap((group) =>
  group.permissions.map((permission) => ({
    key: permission.key,
    group: group.id,
    label: permission.label,
  })),
);

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((permission) => permission.key);
const PERMISSION_KEY_SET = new Set(PERMISSION_KEYS);

export function isPermissionKey(value: string): boolean {
  return PERMISSION_KEY_SET.has(value);
}

export const ALL_PERMISSION_KEYS = [...PERMISSION_KEYS];
