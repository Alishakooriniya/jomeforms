/* خواندن/نوشتن پایگاه‌داده سمت کلاینت.
   تا آماده‌شدن بک‌اند، همه‌چیز در localStorage نگه‌داری می‌شود؛
   ساختار داده دقیقاً همان چیزی است که در docs/database-schema.sql آمده. */

import type { DbShape, ScanFile, User } from '../types';
import { buildSeedDb, DEFAULT_SETTINGS, SEED_COMPANIES } from '../data/seed';
import { PRESET_ROLES } from '../data/permissions';
import { nowISO } from '../lib/format';
import { putBlob } from '../lib/idb';
import { KEYS, readJSON, readString, removeItem, writeJSON } from '../lib/storage';

const SEED_VERSION = 1;

export function emptyDb(): DbShape {
  return {
    users: [],
    companies: [],
    clients: [],
    documents: [],
    templates: [],
    roles: [],
    scans: [],
    audit: [],
    settings: DEFAULT_SETTINGS,
  };
}

/** داده نمایشی اسکن: تصویر ساختگی برگه امضاشده تا گالری اسکن قابل بررسی باشد */
function drawDemoScan(label: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 820;
      canvas.height = 1120;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);
      ctx.strokeStyle = '#d1d1d1';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

      ctx.fillStyle = '#24815d';
      ctx.font = 'bold 26px Tahoma, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('نمونه تصویر اسکن‌شده — دمو', canvas.width - 60, 100);
      ctx.font = '18px Tahoma, sans-serif';
      ctx.fillStyle = '#565656';
      ctx.fillText('این تصویر به‌صورت خودکار ساخته شده است.', canvas.width - 60, 136);

      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      for (let i = 0; i < 22; i += 1) {
        const y = 190 + i * 34;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(canvas.width - 60 - (i % 4) * 60, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#878787';
      ctx.font = '16px Tahoma, sans-serif';
      ctx.fillText(label.slice(0, 60), canvas.width - 60, canvas.height - 90);
      ctx.fillText('امضا: ....................', canvas.width - 60, canvas.height - 56);

      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    } catch {
      resolve(null);
    }
  });
}

async function generateDemoScans(scans: ScanFile[]) {
  const demo = scans.filter((scan) => scan.blobKey.startsWith('demo://')).slice(0, 8);
  for (const scan of demo) {
    const blob = await drawDemoScan(scan.name);
    if (blob) await putBlob(scan.blobKey, blob);
  }
}

export function saveDb(db: DbShape) {
  writeJSON(KEYS.users, db.users);
  writeJSON(KEYS.companies, db.companies);
  writeJSON(KEYS.clients, db.clients);
  writeJSON(KEYS.documents, db.documents);
  writeJSON(KEYS.templates, db.templates);
  writeJSON(KEYS.roles, db.roles);
  writeJSON(KEYS.scans, db.scans);
  writeJSON(KEYS.audit, db.audit);
  writeJSON(KEYS.settings, db.settings);
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

/**
 * ارتقای خودکار نقش‌های آماده: اگر کاربری دست‌نخورده روی یک نقش آماده باشد که
 * در این نسخه چند دسترسی تازه (مثل companies.view/assign) به آن اضافه شده،
 * همان دسترسی‌ها به او هم اضافه می‌شود. دسترسی‌های سفارشی دست‌کاری نمی‌شوند.
 */
function upgradePresetUsers(users: User[]): { users: User[]; changed: boolean } {
  let changed = false;
  const next = users.map((user) => {
    if (user.role === 'superadmin' || user.permissions.includes('*')) return user;
    const preset = PRESET_ROLES.find((role) => {
      const legacy = role.permissions.filter((key) => !key.startsWith('companies.'));
      return legacy.length !== role.permissions.length && sameSet(user.permissions, legacy);
    });
    if (!preset) return user;
    changed = true;
    return { ...user, permissions: [...preset.permissions], updatedAt: nowISO() };
  });
  return { users: next, changed };
}

/** بارگذاری داده‌ها؛ در اجرای اول داده نمونه ساخته می‌شود */
export function loadDb(): DbShape {
  const users = readJSON<DbShape['users']>(KEYS.users, []);
  const templates = readJSON<DbShape['templates']>(KEYS.templates, []);
  const meta = readJSON<{ seedVersion?: number }>(KEYS.meta, {});

  if (!users.length && !templates.length && !meta.seedVersion) {
    const seeded = buildSeedDb();
    saveDb(seeded);
    writeJSON(KEYS.meta, { seedVersion: SEED_VERSION, seededAt: nowISO() });
    void generateDemoScans(seeded.scans);
    return seeded;
  }

  // ارتقای نقش‌های آماده‌ای که در نسخه جدید دسترسی مجموعه‌ها گرفته‌اند
  const upgraded = upgradePresetUsers(users);
  if (upgraded.changed) writeJSON(KEYS.users, upgraded.users);

  // مهاجرت کوچک: اگر داده‌های قدیمی (پیش از افزودن مجموعه‌ها) در مرورگر باشد،
  // نمونه‌های مجموعه یک‌بار اضافه می‌شوند تا بخش «مجموعه‌ها» خالی نماند.
  let companies = readJSON<DbShape['companies']>(KEYS.companies, []);
  if (!companies.length && users.length && readString(KEYS.companies) === null) {
    companies = SEED_COMPANIES;
    writeJSON(KEYS.companies, companies);
  }

  return {
    users: upgraded.users,
    companies,
    clients: readJSON<DbShape['clients']>(KEYS.clients, []),
    documents: readJSON<DbShape['documents']>(KEYS.documents, []),
    templates,
    roles: readJSON<DbShape['roles']>(KEYS.roles, []),
    scans: readJSON<DbShape['scans']>(KEYS.scans, []),
    audit: readJSON<DbShape['audit']>(KEYS.audit, []),
    settings: { ...DEFAULT_SETTINGS, ...readJSON<Partial<DbShape['settings']>>(KEYS.settings, {}) },
  };
}

/** پاک‌کردن همه داده‌ها و ساخت دوباره داده نمونه */
export function resetDb(): DbShape {
  [
    KEYS.users,
    KEYS.companies,
    KEYS.clients,
    KEYS.documents,
    KEYS.templates,
    KEYS.roles,
    KEYS.scans,
    KEYS.audit,
    KEYS.settings,
    KEYS.meta,
  ].forEach(removeItem);
  const seeded = buildSeedDb();
  saveDb(seeded);
  writeJSON(KEYS.meta, { seedVersion: SEED_VERSION, seededAt: nowISO() });
  return seeded;
}

/** پاک‌کردن کامل (بدون داده نمونه) — برای شروع کار واقعی */
export function emptyAndSave(): DbShape {
  const blank = emptyDb();
  saveDb(blank);
  writeJSON(KEYS.meta, { seedVersion: SEED_VERSION, seededAt: nowISO(), cleared: true });
  return blank;
}
