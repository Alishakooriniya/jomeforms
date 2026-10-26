/* ذخیره ترجیحات ظاهری مرورگر (پوسته روشن/تاریک).
   داده‌های کسب‌وکار فقط روی سرور/PostgreSQL نگه‌داری می‌شوند و هیچ‌کدام
   در localStorage نوشته نمی‌شود. */

export const KEYS = {
  theme: 'crm.theme.v1',
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

const canUseStorage = (() => {
  try {
    const probe = '__crm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

const memoryFallback = new Map<string, string>();

/* پاک‌سازی یک‌باره کلیدهای قدیمی: نسخه‌های قبلی داده‌های کسب‌وکار را با
   پیشوند `crm.` در localStorage می‌نوشتند؛ همه جز پوسته حذف می‌شوند. */
if (canUseStorage) {
  try {
    const legacyKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith('crm.') && key !== KEYS.theme) legacyKeys.push(key);
    }
    legacyKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* نادیده */
  }
}

export function readJSON<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = canUseStorage ? window.localStorage.getItem(key) : (memoryFallback.get(key) ?? null);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: StorageKey, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value);
    if (canUseStorage) window.localStorage.setItem(key, raw);
    else memoryFallback.set(key, raw);
    return true;
  } catch {
    return false;
  }
}
