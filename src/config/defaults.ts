import type { AppSettings } from '../types';

/** مقادیر پیش‌فرض تنظیمات تا پاسخ GET /settings برسد */
export const DEFAULT_SETTINGS: AppSettings = {
  orgPhone: '021-88776655',
  orgAddress: 'تهران، خیابان ولیعصر، پلاک ۱۲۴۰، طبقه سوم',
  defaultProvince: 'تهران',
  defaultCity: 'تهران',
  docPrefix: 'س-',
  clientPrefix: 'پ-',
  showPersianDigits: true,
  defaultPageSize: 10,
  contractNote: 'تصویر اسکن‌شده امضاشده حداکثر ۴۸ ساعت پس از امضا بارگذاری شود.',
};
