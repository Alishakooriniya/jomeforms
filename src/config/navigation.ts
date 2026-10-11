/* فهرست منوی برنامه — هر آیتم با یک دسترسی گره خورده است.
   برای افزودن صفحه جدید فقط یک ردیف اینجا و یک مسیر در App.tsx لازم است. */

import type { IconName } from '../components/ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  permission: string;
  end?: boolean;
  section: 'اصلی' | 'مدیریت' | 'سامانه';
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'داشبورد', icon: 'dashboard', permission: 'dashboard.view', end: true, section: 'اصلی' },
  { to: '/clients', label: 'پرونده‌ها', icon: 'users', permission: 'clients.view', section: 'اصلی' },
  { to: '/documents', label: 'اسناد و فرم‌ها', icon: 'file-text', permission: 'documents.view', section: 'اصلی' },
  { to: '/templates', label: 'قالب فرم‌ها', icon: 'template', permission: 'templates.view', section: 'اصلی' },
  { to: '/reports', label: 'گزارش‌ها', icon: 'chart', permission: 'reports.view', section: 'اصلی' },
  { to: '/collections', label: 'مجموعه‌ها', icon: 'building', permission: 'companies.view', section: 'مدیریت' },
  { to: '/users', label: 'کاربران', icon: 'user-cog', permission: 'users.view', section: 'مدیریت' },
  { to: '/roles', label: 'نقش‌ها و دسترسی‌ها', icon: 'shield', permission: 'roles.view', section: 'مدیریت' },
  { to: '/audit', label: 'گزارش فعالیت', icon: 'history', permission: 'audit.view', section: 'مدیریت' },
  { to: '/settings', label: 'تنظیمات', icon: 'settings', permission: 'settings.view', section: 'سامانه' },
];

export const NAV_SECTIONS: Array<NavItem['section']> = ['اصلی', 'مدیریت', 'سامانه'];

/** عنوان صفحه بر پایه مسیر (برای سرصفحه و عنوان تب مرورگر) */
export function titleForPath(pathname: string): string {
  if (pathname.startsWith('/clients')) return 'پرونده‌ها';
  if (pathname.startsWith('/documents')) return 'اسناد و فرم‌ها';
  if (pathname.startsWith('/templates')) return 'قالب فرم‌ها';
  if (pathname.startsWith('/reports')) return 'گزارش‌ها';
  if (pathname.startsWith('/collections')) return 'مجموعه‌ها';
  if (pathname.startsWith('/users')) return 'کاربران';
  if (pathname.startsWith('/roles')) return 'نقش‌ها و دسترسی‌ها';
  if (pathname.startsWith('/audit')) return 'گزارش فعالیت';
  if (pathname.startsWith('/settings')) return 'تنظیمات';
  if (pathname === '/') return 'داشبورد';
  return 'سامانه املاک';
}
