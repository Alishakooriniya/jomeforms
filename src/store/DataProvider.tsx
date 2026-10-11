/* استور مرکزی: نگه‌داری داده‌ها + عملیات (CRUD) + ثبت گزارش فعالیت.
   ساختار آن طوری چیده شده که با اتصال بک‌اند فقط پیاده‌سازی این توابع
   با درخواست‌های HTTP جایگزین شود (به src/lib/api.ts نگاه کنید). */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppSettings,
  AuditEntity,
  AuditEntry,
  Client,
  Company,
  DbShape,
  DocRecord,
  DocStatus,
  FormTemplate,
  PermissionRole,
  ScanFile,
  User,
} from '../types';
import { emptyAndSave, loadDb, resetDb, saveDb } from './db';
import { hashPassword, suggestPassword } from '../lib/crypto';
import { jalaliYear, nowISO, sequenceNumber } from '../lib/format';
import { autofillValues } from '../lib/template';
import { deleteBlob, putBlob } from '../lib/idb';
import { compressImage, uid } from '../lib/utils';

/* ------------------------------ ورودی‌ها ------------------------------ */

export type ClientDraft = Omit<Client, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy'> & {
  code?: string;
};

export interface DocumentDraft {
  templateId: string;
  clientId?: string;
  values: Record<string, string>;
  status?: DocStatus;
  tags?: string[];
  notes?: string;
}

export type TemplateDraft = Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> & {
  version?: number;
};

export type UserDraft = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'passwordHash'> & {
  password?: string;
};

export type RoleDraft = Omit<PermissionRole, 'id' | 'createdAt' | 'createdBy'>;

export type CompanyDraft = Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface DataActions {
  saveClient: (input: ClientDraft, id?: string) => Client;
  deleteClient: (id: string) => void;
  createDocument: (input: DocumentDraft) => DocRecord;
  updateDocument: (id: string, patch: Partial<DocRecord>, logAction?: string) => void;
  setDocumentStatus: (id: string, status: DocStatus) => void;
  deleteDocument: (id: string) => void;
  addScan: (documentId: string, file: File) => Promise<ScanFile | null>;
  deleteScan: (scanId: string) => Promise<void>;
  saveTemplate: (input: TemplateDraft, id?: string) => FormTemplate;
  duplicateTemplate: (id: string) => FormTemplate | null;
  deleteTemplate: (id: string) => void;
  saveUser: (input: UserDraft, id?: string) => ActionResult & { user?: User };
  deleteUser: (id: string) => ActionResult;
  toggleUserActive: (id: string) => void;
  saveRole: (input: RoleDraft, id?: string) => PermissionRole;
  deleteRole: (id: string) => ActionResult;
  saveCompany: (input: CompanyDraft, id?: string) => Company;
  deleteCompany: (id: string) => ActionResult & { detached: number };
  /** همگام‌سازی اعضای یک مجموعه: کاربران انتخابی به آن وصل و بقیه‌ی اعضای قبلی آزاد می‌شوند */
  setCompanyMembers: (companyId: string, userIds: string[]) => ActionResult & { added: number; removed: number };
  updateSettings: (patch: Partial<AppSettings>) => void;
  touchLogin: (userId: string) => void;
  log: (entry: { action: string; entity: AuditEntity; entityId?: string; entityLabel?: string; detail?: string }) => void;
  clearAudit: () => void;
  resetDemoData: () => void;
  clearAllData: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => ActionResult;
}

/* --------------------------- بازیگر جاری ---------------------------- */

interface Actor {
  id: string;
  name: string;
}

let currentActor: Actor = { id: 'system', name: 'سیستم' };

/** توسط AuthProvider هنگام ورود/خروج تنظیم می‌شود */
export function setCurrentActor(actor: Actor | null) {
  currentActor = actor ?? { id: 'system', name: 'سیستم' };
}

/* ----------------------------- کمکی‌ها ------------------------------ */

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** شماره ترتیبی بعدی در سال جاری (بر اساس بیشترین شماره موجود) */
function nextSequence(values: string[], prefix: string): number {
  const year = jalaliYear();
  const pattern = new RegExp(`^${escapeForRegExp(prefix)}${year}-(\\d+)$`);
  let max = 0;
  values.forEach((value) => {
    const match = pattern.exec(value ?? '');
    if (match) max = Math.max(max, Number(match[1]));
  });
  return max + 1;
}

function pushAudit(draft: DbShape, entry: { action: string; entity: AuditEntity; entityId?: string; entityLabel?: string; detail?: string }) {
  const record: AuditEntry = {
    id: uid('log'),
    at: nowISO(),
    userId: currentActor.id,
    userName: currentActor.name,
    ...entry,
  };
  draft.audit = [record, ...draft.audit].slice(0, 600);
}

/* ---------------------------- Context ------------------------------ */

const StateContext = createContext<DbShape | null>(null);
const ActionsContext = createContext<DataActions | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DbShape>(() => loadDb());
  const dbRef = useRef(db);
  dbRef.current = db;

  // ذخیره با تأخیر کوتاه تا رندر تند تند دیسک را مشغول نکند
  useEffect(() => {
    const timer = setTimeout(() => saveDb(db), 250);
    return () => clearTimeout(timer);
  }, [db]);

  const commit = useCallback((mutate: (draft: DbShape) => void) => {
    setDb((prev) => {
      const next: DbShape = {
        users: [...prev.users],
        companies: [...prev.companies],
        clients: [...prev.clients],
        documents: [...prev.documents],
        templates: [...prev.templates],
        roles: [...prev.roles],
        scans: [...prev.scans],
        audit: [...prev.audit],
        settings: prev.settings,
      };
      mutate(next);
      return next;
    });
  }, []);

  const actions = useMemo<DataActions>(() => {
    const log: DataActions['log'] = (entry) => commit((draft) => pushAudit(draft, entry));

    return {
      log,

      /* ------------------------------ پرونده‌ها ------------------------------ */
      saveClient(input, id) {
        const now = nowISO();
        if (id) {
          const existing = dbRef.current.clients.find((item) => item.id === id);
          const updated: Client = {
            ...(existing as Client),
            ...input,
            id,
            code: input.code || existing?.code || '',
            updatedAt: now,
          };
          commit((draft) => {
            const index = draft.clients.findIndex((item) => item.id === id);
            if (index > -1) draft.clients[index] = updated;
            pushAudit(draft, {
              action: 'ویرایش پرونده',
              entity: 'client',
              entityId: id,
              entityLabel: updated.fullName,
            });
          });
          return updated;
        }
        const code =
          input.code?.trim() ||
          sequenceNumber(
            dbRef.current.settings.clientPrefix,
            nextSequence(
              dbRef.current.clients.map((item) => item.code),
              dbRef.current.settings.clientPrefix,
            ),
          );
        const created: Client = {
          ...input,
          id: uid('cl-'),
          code,
          createdAt: now,
          updatedAt: now,
          createdBy: currentActor.id,
        };
        commit((draft) => {
          draft.clients = [created, ...draft.clients];
          pushAudit(draft, {
            action: 'ایجاد پرونده',
            entity: 'client',
            entityId: created.id,
            entityLabel: created.fullName,
          });
        });
        return created;
      },

      deleteClient(id) {
        const target = dbRef.current.clients.find((item) => item.id === id);
        commit((draft) => {
          draft.clients = draft.clients.filter((item) => item.id !== id);
          pushAudit(draft, {
            action: 'حذف پرونده',
            entity: 'client',
            entityId: id,
            entityLabel: target?.fullName,
          });
        });
      },

      /* -------------------------------- اسناد -------------------------------- */
      createDocument(input) {
        const now = nowISO();
        const template = dbRef.current.templates.find((item) => item.id === input.templateId);
        const client = input.clientId
          ? dbRef.current.clients.find((item) => item.id === input.clientId)
          : undefined;
        const values = { ...(template ? autofillValues(template, client) : {}), ...input.values };
        const number = sequenceNumber(
          dbRef.current.settings.docPrefix,
          nextSequence(
            dbRef.current.documents.map((item) => item.number),
            dbRef.current.settings.docPrefix,
          ),
        );
        const created: DocRecord = {
          id: uid('doc-'),
          number,
          title: template?.title ?? 'سند بدون قالب',
          templateId: input.templateId,
          templateTitle: template?.title ?? '—',
          templateVersion: template?.version ?? 1,
          clientId: client?.id,
          clientName: client?.fullName,
          clientCode: client?.code,
          values,
          status: input.status ?? 'draft',
          tags: input.tags ?? [],
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
          createdBy: currentActor.id,
          createdByName: currentActor.name,
          scanIds: [],
        };
        commit((draft) => {
          draft.documents = [created, ...draft.documents];
          pushAudit(draft, {
            action: 'ایجاد سند',
            entity: 'document',
            entityId: created.id,
            entityLabel: created.title,
            detail: client ? `بر پایه پرونده ${client.fullName}` : 'بدون پرونده',
          });
        });
        return created;
      },

      updateDocument(id, patch, logAction) {
        const target = dbRef.current.documents.find((item) => item.id === id);
        commit((draft) => {
          const index = draft.documents.findIndex((item) => item.id === id);
          if (index < 0) return;
          draft.documents[index] = { ...draft.documents[index], ...patch, updatedAt: nowISO() };
          if (logAction !== undefined) {
            pushAudit(draft, {
              action: logAction || 'ویرایش سند',
              entity: 'document',
              entityId: id,
              entityLabel: target?.title,
            });
          }
        });
      },

      setDocumentStatus(id, status) {
        const target = dbRef.current.documents.find((item) => item.id === id);
        commit((draft) => {
          const index = draft.documents.findIndex((item) => item.id === id);
          if (index < 0) return;
          const previous = draft.documents[index];
          const signedAt = status === 'signed' || status === 'scanned' ? (previous.signedAt ?? nowISO()) : previous.signedAt;
          draft.documents[index] = { ...previous, status, signedAt, updatedAt: nowISO() };
          pushAudit(draft, {
            action: 'تغییر وضعیت سند',
            entity: 'document',
            entityId: id,
            entityLabel: target?.title,
            detail: `${previous.status} → ${status}`,
          });
        });
      },

      deleteDocument(id) {
        const target = dbRef.current.documents.find((item) => item.id === id);
        const scans = dbRef.current.scans.filter((scan) => scan.documentId === id);
        scans.forEach((scan) => void deleteBlob(scan.blobKey));
        commit((draft) => {
          draft.documents = draft.documents.filter((item) => item.id !== id);
          draft.scans = draft.scans.filter((scan) => scan.documentId !== id);
          pushAudit(draft, {
            action: 'حذف سند',
            entity: 'document',
            entityId: id,
            entityLabel: target?.title,
          });
        });
      },

      /* ------------------------------- اسکن‌ها ------------------------------- */
      async addScan(documentId, file) {
        const target = dbRef.current.documents.find((item) => item.id === documentId);
        if (!target) return null;
        const compressed = await compressImage(file);
        const blobKey = `scan://${uid()}`;
        await putBlob(blobKey, compressed);
        const scan: ScanFile = {
          id: uid('scan-'),
          documentId,
          name: file.name,
          mime: compressed.type || file.type || 'image/jpeg',
          size: compressed.size || file.size,
          blobKey,
          pages: 1,
          uploadedAt: nowISO(),
          uploadedBy: currentActor.name,
        };
        commit((draft) => {
          draft.scans = [scan, ...draft.scans];
          const index = draft.documents.findIndex((item) => item.id === documentId);
          if (index > -1) {
            const document = draft.documents[index];
            draft.documents[index] = {
              ...document,
              scanIds: [...document.scanIds, scan.id],
              status: document.status === 'archived' ? document.status : 'scanned',
              // بارگذاری نسخه اسکن‌شده یعنی سند امضا شده است
              signedAt: document.signedAt ?? nowISO(),
              updatedAt: nowISO(),
            };
          }
          pushAudit(draft, {
            action: 'بارگذاری اسکن امضاشده',
            entity: 'scan',
            entityId: scan.id,
            entityLabel: target.title,
            detail: file.name,
          });
        });
        return scan;
      },

      async deleteScan(scanId) {
        const scan = dbRef.current.scans.find((item) => item.id === scanId);
        if (!scan) return;
        await deleteBlob(scan.blobKey);
        commit((draft) => {
          draft.scans = draft.scans.filter((item) => item.id !== scanId);
          const index = draft.documents.findIndex((item) => item.id === scan.documentId);
          if (index > -1) {
            draft.documents[index] = {
              ...draft.documents[index],
              scanIds: draft.documents[index].scanIds.filter((id) => id !== scanId),
              updatedAt: nowISO(),
            };
          }
          pushAudit(draft, {
            action: 'حذف اسکن',
            entity: 'scan',
            entityId: scanId,
            entityLabel: scan.name,
          });
        });
      },

      /* ------------------------------- قالب‌ها ------------------------------ */
      saveTemplate(input, id) {
        const now = nowISO();
        if (id) {
          const existing = dbRef.current.templates.find((item) => item.id === id);
          const updated: FormTemplate = {
            ...(existing as FormTemplate),
            ...input,
            id,
            version: existing?.version ?? input.version ?? 1,
            updatedAt: now,
          };
          commit((draft) => {
            const index = draft.templates.findIndex((item) => item.id === id);
            if (index > -1) draft.templates[index] = updated;
            pushAudit(draft, {
              action: 'ویرایش قالب فرم',
              entity: 'template',
              entityId: id,
              entityLabel: updated.title,
            });
          });
          return updated;
        }
        const created: FormTemplate = {
          ...input,
          id: uid('tpl-'),
          version: input.version ?? 1,
          createdAt: now,
          updatedAt: now,
          createdBy: currentActor.id,
        };
        commit((draft) => {
          draft.templates = [created, ...draft.templates];
          pushAudit(draft, {
            action: 'افزودن قالب فرم',
            entity: 'template',
            entityId: created.id,
            entityLabel: created.title,
          });
        });
        return created;
      },

      duplicateTemplate(id) {
        const source = dbRef.current.templates.find((item) => item.id === id);
        if (!source) return null;
        const now = nowISO();
        const created: FormTemplate = {
          ...source,
          id: uid('tpl-'),
          title: `${source.title} (کپی)`,
          fields: source.fields.map((field) => ({ ...field, id: uid('tf') })),
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: currentActor.id,
        };
        commit((draft) => {
          draft.templates = [created, ...draft.templates];
          pushAudit(draft, {
            action: 'کپی قالب فرم',
            entity: 'template',
            entityId: created.id,
            entityLabel: created.title,
          });
        });
        return created;
      },

      deleteTemplate(id) {
        const target = dbRef.current.templates.find((item) => item.id === id);
        const used = dbRef.current.documents.filter((item) => item.templateId === id).length;
        commit((draft) => {
          draft.templates = draft.templates.filter((item) => item.id !== id);
          pushAudit(draft, {
            action: 'حذف قالب فرم',
            entity: 'template',
            entityId: id,
            entityLabel: target?.title,
            detail: used ? `${used} سند ساخته‌شده از این قالب باقی می‌ماند` : undefined,
          });
        });
      },

      /* ------------------------------- کاربران ------------------------------ */
      saveUser(input, id) {
        const users = dbRef.current.users;
        const username = input.username.trim().toLowerCase();
        const duplicate = users.find((item) => item.username.toLowerCase() === username && item.id !== id);
        if (duplicate) return { ok: false, error: 'این نام کاربری قبلاً ثبت شده است.' };

        if (id) {
          const existing = users.find((item) => item.id === id);
          if (!existing) return { ok: false, error: 'کاربر یافت نشد.' };
          const isLastSuperadmin = existing.role === 'superadmin' && users.filter((u) => u.role === 'superadmin').length === 1;
          if (isLastSuperadmin && (input.role !== 'superadmin' || !input.active)) {
            return { ok: false, error: 'آخرین مدیر ارشد سامانه را نمی‌توان تغییر نقش یا غیرفعال کرد.' };
          }
          const updated: User = {
            ...existing,
            ...input,
            id,
            username,
            permissions: input.role === 'superadmin' ? ['*'] : input.permissions,
            updatedAt: nowISO(),
          };
          if (input.password) updated.passwordHash = hashPassword(input.password);
          else updated.passwordHash = existing.passwordHash;
          delete (updated as Partial<User> & { password?: string }).password;
          commit((draft) => {
            const index = draft.users.findIndex((item) => item.id === id);
            if (index > -1) draft.users[index] = updated;
            pushAudit(draft, {
              action: 'ویرایش کاربر',
              entity: 'user',
              entityId: id,
              entityLabel: updated.fullName,
              detail: input.password ? 'رمز عبور بازنشانی شد' : `${updated.permissions.length} دسترسی`,
            });
          });
          return { ok: true, user: updated };
        }

        const created: User = {
          id: uid('u-'),
          username,
          fullName: input.fullName,
          passwordHash: hashPassword(input.password || suggestPassword()),
          role: input.role,
          permissions: input.role === 'superadmin' ? ['*'] : input.permissions,
          title: input.title,
          mobile: input.mobile,
          active: input.active,
          note: input.note,
          createdAt: nowISO(),
        };
        commit((draft) => {
          draft.users = [...draft.users, created];
          pushAudit(draft, {
            action: 'ایجاد کاربر',
            entity: 'user',
            entityId: created.id,
            entityLabel: created.fullName,
            detail: created.role === 'superadmin' ? 'مدیر ارشد' : `${created.permissions.length} دسترسی`,
          });
        });
        return { ok: true, user: created };
      },

      deleteUser(id) {
        const target = dbRef.current.users.find((item) => item.id === id);
        if (!target) return { ok: false, error: 'کاربر یافت نشد.' };
        if (target.role === 'superadmin') {
          return { ok: false, error: 'حساب مدیر ارشد قابل حذف نیست؛ در صورت نیاز آن را غیرفعال کنید.' };
        }
        commit((draft) => {
          draft.users = draft.users.filter((item) => item.id !== id);
          pushAudit(draft, {
            action: 'حذف کاربر',
            entity: 'user',
            entityId: id,
            entityLabel: target.fullName,
          });
        });
        return { ok: true };
      },

      toggleUserActive(id) {
        const target = dbRef.current.users.find((item) => item.id === id);
        if (!target) return;
        commit((draft) => {
          const index = draft.users.findIndex((item) => item.id === id);
          if (index < 0) return;
          const next = { ...draft.users[index], active: !draft.users[index].active, updatedAt: nowISO() };
          draft.users[index] = next;
          pushAudit(draft, {
            action: next.active ? 'فعال‌سازی کاربر' : 'غیرفعال‌سازی کاربر',
            entity: 'user',
            entityId: id,
            entityLabel: next.fullName,
          });
        });
      },

      /* -------------------------------- نقش‌ها ------------------------------ */
      saveRole(input, id) {
        const now = nowISO();
        const created: PermissionRole = {
          ...input,
          id: id ?? uid('role-'),
          createdAt: dbRef.current.roles.find((role) => role.id === id)?.createdAt ?? now,
          createdBy: currentActor.id,
        };
        commit((draft) => {
          const index = draft.roles.findIndex((role) => role.id === created.id);
          if (index > -1) {
            created.system = draft.roles[index].system;
            draft.roles[index] = created;
          } else {
            draft.roles = [...draft.roles, created];
          }
          pushAudit(draft, {
            action: id ? 'ویرایش نقش' : 'ایجاد نقش',
            entity: 'role',
            entityId: created.id,
            entityLabel: created.name,
            detail: `${created.permissions.length} دسترسی`,
          });
        });
        return created;
      },

      deleteRole(id) {
        const target = dbRef.current.roles.find((role) => role.id === id);
        if (!target) return { ok: false, error: 'نقش یافت نشد.' };
        if (target.system) return { ok: false, error: 'نقش‌های آماده سامانه قابل حذف نیستند.' };
        commit((draft) => {
          draft.roles = draft.roles.filter((role) => role.id !== id);
          pushAudit(draft, { action: 'حذف نقش', entity: 'role', entityId: id, entityLabel: target.name });
        });
        return { ok: true };
      },

      /* ------------------------------ مجموعه‌ها ----------------------------- */
      saveCompany(input, id) {
        const now = nowISO();
        const payload: CompanyDraft = { ...input, name: input.name.trim() };
        if (id) {
          const existing = dbRef.current.companies.find((item) => item.id === id);
          const updated: Company = { ...(existing as Company), ...payload, id, updatedAt: now };
          commit((draft) => {
            const index = draft.companies.findIndex((item) => item.id === id);
            if (index > -1) draft.companies[index] = updated;
            pushAudit(draft, {
              action: 'ویرایش مجموعه',
              entity: 'company',
              entityId: id,
              entityLabel: updated.name,
            });
          });
          return updated;
        }
        const created: Company = {
          ...payload,
          id: uid('co-'),
          createdAt: now,
          updatedAt: now,
          createdBy: currentActor.id,
        };
        commit((draft) => {
          draft.companies = [created, ...draft.companies];
          pushAudit(draft, {
            action: 'افزودن مجموعه',
            entity: 'company',
            entityId: created.id,
            entityLabel: created.name,
          });
        });
        return created;
      },

      deleteCompany(id) {
        const target = dbRef.current.companies.find((item) => item.id === id);
        if (!target) return { ok: false, error: 'مجموعه یافت نشد.', detached: 0 };
        const detached = dbRef.current.users.filter((user) => user.companyId === id).length;
        commit((draft) => {
          draft.companies = draft.companies.filter((item) => item.id !== id);
          // کاربران این مجموعه حذف نمی‌شوند؛ فقط بدون مجموعه می‌شوند
          draft.users = draft.users.map((user) =>
            user.companyId === id ? { ...user, companyId: undefined, updatedAt: nowISO() } : user,
          );
          pushAudit(draft, {
            action: 'حذف مجموعه',
            entity: 'company',
            entityId: id,
            entityLabel: target.name,
            detail: detached ? `${detached} کاربر از این مجموعه جدا شد` : undefined,
          });
        });
        return { ok: true, detached };
      },

      setCompanyMembers(companyId, userIds) {
        const company = dbRef.current.companies.find((item) => item.id === companyId);
        if (!company) return { ok: false, error: 'مجموعه یافت نشد.', added: 0, removed: 0 };
        const wanted = new Set(userIds);
        const users = dbRef.current.users;
        const joining = users.filter((user) => wanted.has(user.id) && user.companyId !== companyId);
        const leaving = users.filter((user) => !wanted.has(user.id) && user.companyId === companyId);
        if (!joining.length && !leaving.length) return { ok: true, added: 0, removed: 0 };
        const joiningIds = new Set(joining.map((user) => user.id));
        const leavingIds = new Set(leaving.map((user) => user.id));
        const now = nowISO();
        commit((draft) => {
          draft.users = draft.users.map((user) => {
            if (joiningIds.has(user.id)) return { ...user, companyId, updatedAt: now };
            if (leavingIds.has(user.id)) return { ...user, companyId: undefined, updatedAt: now };
            return user;
          });
          pushAudit(draft, {
            action: 'اتصال کاربران به مجموعه',
            entity: 'company',
            entityId: companyId,
            entityLabel: company.name,
            detail: `${joining.length} اتصال • ${leaving.length} جدایی`,
          });
        });
        return { ok: true, added: joining.length, removed: leaving.length };
      },

      /* ------------------------------ تنظیمات ----------------------------- */
      updateSettings(patch) {
        commit((draft) => {
          draft.settings = { ...draft.settings, ...patch };
        });
      },

      touchLogin(userId) {
        commit((draft) => {
          const index = draft.users.findIndex((item) => item.id === userId);
          if (index > -1) draft.users[index] = { ...draft.users[index], lastLoginAt: nowISO() };
        });
      },

      clearAudit() {
        commit((draft) => {
          draft.audit = [];
        });
      },

      resetDemoData() {
        const seeded = resetDb();
        setDb(seeded);
      },

      clearAllData() {
        const blank = emptyAndSave();
        setDb(blank);
      },

      exportBackup() {
        const { users, companies, clients, documents, templates, roles, scans, audit, settings } = dbRef.current;
        return JSON.stringify(
          { version: 1, exportedAt: nowISO(), users, companies, clients, documents, templates, roles, scans, audit, settings },
          null,
          2,
        );
      },

      importBackup(json) {
        try {
          const parsed = JSON.parse(json) as Partial<DbShape>;
          if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.users)) {
            return { ok: false, error: 'فایل پشتیبان معتبر نیست.' };
          }
          const next: DbShape = {
            users: parsed.users ?? [],
            companies: parsed.companies ?? [],
            clients: parsed.clients ?? [],
            documents: parsed.documents ?? [],
            templates: parsed.templates ?? [],
            roles: parsed.roles ?? [],
            scans: parsed.scans ?? [],
            audit: parsed.audit ?? [],
            settings: { ...dbRef.current.settings, ...(parsed.settings ?? {}) },
          };
          setDb(next);
          return { ok: true };
        } catch {
          return { ok: false, error: 'خواندن فایل پشتیبان ناموفق بود.' };
        }
      },
    };
  }, [commit]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={db}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useDb(): DbShape {
  const value = useContext(StateContext);
  if (!value) throw new Error('useDb باید داخل DataProvider استفاده شود.');
  return value;
}

export function useDbActions(): DataActions {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('useDbActions باید داخل DataProvider استفاده شود.');
  return value;
}
