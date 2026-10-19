/* لایه ذخیره‌سازی محلی.
   تا آماده‌شدن بک‌اند، داده‌ها در localStorage نگه‌داری می‌شوند و
   فایل‌های اسکن در IndexedDB (src/lib/idb.ts) تا حجم صفحه سبک بماند. */

export const KEYS = {
  theme: 'crm.theme.v1',
  session: 'crm.session.v1',
  users: 'crm.users.v1',
  companies: 'crm.companies.v1',
  clients: 'crm.clients.v1',
  documents: 'crm.documents.v1',
  scans: 'crm.scans.v1',
  workflowEvidence: 'crm.workflow-evidence.v1',
  templates: 'crm.templates.v1',
  roles: 'crm.roles.v1',
  audit: 'crm.audit.v1',
  settings: 'crm.settings.v1',
  meta: 'crm.meta.v1',
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
    // سهمیه پر شده یا حافظه غیرفعال است
    return false;
  }
}

export function removeItem(key: StorageKey) {
  try {
    if (canUseStorage) window.localStorage.removeItem(key);
    else memoryFallback.delete(key);
  } catch {
    /* نادیده */
  }
}

export function readString(key: StorageKey): string | null {
  try {
    return canUseStorage ? window.localStorage.getItem(key) : (memoryFallback.get(key) ?? null);
  } catch {
    return null;
  }
}

export function writeString(key: StorageKey, value: string) {
  try {
    if (canUseStorage) window.localStorage.setItem(key, value);
    else memoryFallback.set(key, value);
  } catch {
    /* نادیده */
  }
}

/** حجم تقریبی داده‌های ذخیره‌شده (بایت) — برای نمایش در تنظیمات */
export function storageFootprint(): number {
  if (!canUseStorage) {
    let total = 0;
    memoryFallback.forEach((value, key) => {
      total += key.length + value.length;
    });
    return total * 2;
  }
  return Object.values(KEYS).reduce((total, key) => {
    const value = window.localStorage.getItem(key);
    return total + (value ? (key.length + value.length) * 2 : 0);
  }, 0);
}

export function clearAllData() {
  Object.values(KEYS).forEach((key) => {
    if (key === KEYS.theme) return; // تم را حفظ کن
    removeItem(key);
  });
}

export function isStorageAvailable(): boolean {
  return canUseStorage;
}
