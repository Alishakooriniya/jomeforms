/* برچسب‌های فارسی و رنگ وضعیت‌ها — یک‌جا، تا در همه صفحه‌ها یکسان بمانند. */

import type {
  AuditEntity,
  ClientStatus,
  ClientCaseType,
  CompanyKind,
  DocStatus,
  FieldType,
  RoleId,
  TemplateCategory,
} from '../types';

export const CLIENT_CASE_TYPE_LABELS: Record<ClientCaseType, string> = {
  document_request: 'درخواست سند',
  rent_renewal: 'تجدید اجاره',
};

export const CLIENT_CASE_TYPE_OPTIONS = Object.entries(CLIENT_CASE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'neutral';

export const ROLE_LABELS: Record<RoleId, string> = {
  superadmin: 'مدیر ارشد',
  admin: 'مدیر',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  new: 'جدید',
  in_progress: 'در جریان',
  awaiting_docs: 'در انتظار مدارک',
  done: 'تکمیل‌شده',
  archived: 'بایگانی',
};

export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  new: 'info',
  in_progress: 'brand',
  awaiting_docs: 'warn',
  done: 'success',
  archived: 'neutral',
};

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'پیش‌نویس',
  awaiting_signature: 'در انتظار امضا',
  signed: 'امضاشده',
  scanned: 'اسکن‌شده',
  archived: 'بایگانی',
};

export const DOC_STATUS_TONE: Record<DocStatus, Tone> = {
  draft: 'neutral',
  awaiting_signature: 'warn',
  signed: 'info',
  scanned: 'success',
  archived: 'neutral',
};

export const COMPANY_KIND_LABELS: Record<CompanyKind, string> = {
  owner: 'مالک زمین',
  developer: 'سازنده',
  cooperative: 'تعاونی',
  investor: 'سرمایه‌گذار',
  org: 'سازمان / نهاد',
  other: 'سایر',
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  sale: 'خرید و فروش',
  rent: 'اجاره',
  mortgage: 'رهن',
  presale: 'پیش‌فروش',
  commission: 'کمیسیون',
  visit: 'بازدید',
  other: 'سایر',
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'متن',
  textarea: 'متن بلند',
  number: 'عدد',
  currency: 'مبلغ (تومان)',
  percent: 'درصد',
  date: 'تاریخ',
  select: 'انتخابی',
  checkbox: 'بله/خیر',
  nationalId: 'کد ملی',
  mobile: 'شماره موبایل',
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntity, string> = {
  auth: 'ورود و خروج',
  client: 'پرونده',
  document: 'سند',
  template: 'فرم',
  user: 'کاربر',
  role: 'نقش',
  company: 'مجموعه',
  settings: 'تنظیمات',
  scan: 'اسکن',
  workflow: 'مرحله پرونده',
  reminder: 'یادآور',
  letterhead: 'سربرگ',
};

/** گزینه‌های پرکاربرد برای فیلترها */
export function toOptions<T extends string>(labels: Record<T, string>): Array<{ value: T; label: string }> {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const COMPANY_KIND_OPTIONS = toOptions(COMPANY_KIND_LABELS);
export const CLIENT_STATUS_OPTIONS = toOptions(CLIENT_STATUS_LABELS);
export const DOC_STATUS_OPTIONS = toOptions(DOC_STATUS_LABELS);
export const TEMPLATE_CATEGORY_OPTIONS = toOptions(TEMPLATE_CATEGORY_LABELS);
export const FIELD_TYPE_OPTIONS = toOptions(FIELD_TYPE_LABELS);
