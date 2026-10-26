/* استور مرکزی: تمام داده‌ها و عملیات از طریق API بک‌اند انجام می‌شود.
   این فایل فقط کش سمت کلاینت را نگه می‌دارد و پس از هر موفقیت، خروجی
   واقعی سرور را در state می‌نشاند. اسکن‌ها و مدارک مراحل پرونده تنبل بارگذاری
   می‌شوند (loadDocumentScans / loadClientDetail). */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppSettings,
  Client,
  Company,
  DbShape,
  DocRecord,
  DocStatus,
  FormTemplate,
  LetterheadConfig,
  LetterheadPaper,
  LetterheadPrintKind,
  Reminder,
  ScanFile,
  User,
  WorkflowEvidence,
} from '../types';
import { api, ApiError } from '../lib/apiClient';
import type { Page, QueryParams } from '../lib/apiClient';
import { DEFAULT_SETTINGS } from '../config/defaults';
import { normalizeJalaliDate } from '../lib/jalali';
import { normalizeReminderTime } from '../lib/reminders';
import { autofillValues } from '../lib/template';
import { compressImage } from '../lib/utils';

/* ------------------------------ ورودی‌ها ------------------------------ */

export type ClientDraft = Pick<Client, 'fullName' | 'nationalId' | 'mobile'> &
  Partial<Omit<Client, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy' | 'fullName' | 'nationalId' | 'mobile'>> & {
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

export type UserDraft = Pick<User, 'username' | 'fullName' | 'mobile' | 'role' | 'permissions' | 'active'> & {
  password?: string;
};

export type CompanyDraft = Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

export type ReminderDraft = Pick<Reminder, 'title' | 'date' | 'time' | 'userId'> & { note?: string };

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface DataActions {
  /** همه‌ی مجموعه‌ها را دوباره از سرور می‌خواند */
  reload: () => Promise<void>;
  /** کش را خالی می‌کند (خروج از حساب) */
  reset: () => void;
  /** اسکن‌های یک سند را از سرور می‌خواند و در کش می‌نشاند */
  loadDocumentScans: (documentId: string) => Promise<void>;
  /** پرونده و مدارک مراحل آن را تازه می‌کند */
  loadClientDetail: (clientId: string) => Promise<void>;

  saveClient: (input: ClientDraft, id?: string) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  addWorkflowEvidence: (clientId: string, stepId: string, file: File) => Promise<WorkflowEvidence | null>;
  completeWorkflowStep: (clientId: string, stepId: string) => Promise<ActionResult>;
  overrideWorkflowStep: (clientId: string, stepId: string, reason: string) => Promise<ActionResult>;
  createDocument: (input: DocumentDraft) => Promise<DocRecord>;
  updateDocument: (id: string, patch: Partial<DocRecord>, logAction?: string) => Promise<void>;
  setDocumentStatus: (id: string, status: DocStatus) => Promise<void>;
  markPrinted: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addScan: (documentId: string, file: File) => Promise<ScanFile | null>;
  deleteScan: (scanId: string) => Promise<void>;
  saveTemplate: (input: TemplateDraft, id?: string) => Promise<FormTemplate>;
  duplicateTemplate: (id: string) => Promise<FormTemplate | null>;
  deleteTemplate: (id: string) => Promise<void>;
  saveUser: (input: UserDraft, id?: string) => Promise<ActionResult & { user?: User }>;
  deleteUser: (id: string) => Promise<ActionResult>;
  toggleUserActive: (id: string) => Promise<void>;
  saveCompany: (input: CompanyDraft, id?: string) => Promise<Company>;
  deleteCompany: (id: string) => Promise<ActionResult & { detached: number }>;
  setCompanyMembers: (companyId: string, userIds: string[]) => Promise<ActionResult & { added: number; removed: number }>;
  createReminder: (input: ReminderDraft) => Promise<ActionResult & { reminder?: Reminder }>;
  markReminderDone: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  /** ویرایش نشانی کادر پایین سربرگ (فقط دارندگان letterhead.manage) */
  saveLetterheadAddress: (address: string) => Promise<ActionResult & { config?: LetterheadConfig }>;
  /** ثبت رخداد چاپ سربرگ در جدول پیگیری + گزارش فعالیت */
  recordLetterheadPrint: (input: {
    paper: LetterheadPaper;
    kind: LetterheadPrintKind;
    values?: Record<string, string>;
  }) => Promise<ActionResult>;
  clearAudit: () => Promise<void>;
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<ActionResult>;
}

/* ----------------------------- کمکی‌ها ------------------------------ */

function blankDb(): DbShape {
  return {
    users: [],
    companies: [],
    clients: [],
    documents: [],
    templates: [],
    scans: [],
    workflowEvidence: [],
    reminders: [],
    audit: [],
    settings: DEFAULT_SETTINGS,
  };
}

/** خطاها را به پیام فارسی مناسب نمایش تبدیل می‌کند */
function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'خطای غیرمنتظره رخ داد.';
}

/** فهرست کامل یک منبع را صفحه‌به‌صفحه می‌خواند */
async function fetchAll<T>(listFn: (query?: QueryParams) => Promise<Page<T>>, sort?: QueryParams): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  for (;;) {
    const result = await listFn({ page, limit: 100, ...sort });
    items.push(...result.items);
    if (page >= result.meta.totalPages || !result.items.length) return items;
    page += 1;
  }
}

/** منابعی که کاربر به آن‌ها دسترسی ندارد به‌جای خطا، فهرست خالی برمی‌گردانند */
async function fetchAllSafe<T>(listFn: (query?: QueryParams) => Promise<Page<T>>, sort?: QueryParams): Promise<T[]> {
  try {
    return await fetchAll(listFn, sort);
  } catch {
    return [];
  }
}

function normalizeClientBirthDate(value?: string | null): string | undefined {
  if (!value?.trim()) return value ?? undefined;
  const normalized = normalizeJalaliDate(value);
  if (!normalized) throw new Error('تاریخ تولد باید شمسی و به‌شکل YYYY/MM/DD باشد.');
  return normalized;
}

function normalizeDocumentDateValues(
  template: FormTemplate | undefined,
  values: Record<string, string>,
): Record<string, string> {
  const normalized = { ...values };
  for (const field of template?.fields ?? []) {
    if (field.type !== 'date' || !normalized[field.key]?.trim()) continue;
    const date = normalizeJalaliDate(normalized[field.key]);
    if (!date) throw new Error(`تاریخ «${field.label}» باید شمسی و به‌شکل YYYY/MM/DD باشد.`);
    normalized[field.key] = date;
  }
  return normalized;
}

function upsert<T extends { id: string }>(items: T[], entity: T): T[] {
  const index = items.findIndex((item) => item.id === entity.id);
  if (index === -1) return [entity, ...items];
  const next = [...items];
  next[index] = { ...next[index], ...entity };
  return next;
}

/* ---------------------------- Context ------------------------------ */

const StateContext = createContext<DbShape | null>(null);
const ActionsContext = createContext<DataActions | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DbShape>(blankDb);
  const dbRef = useRef(db);
  dbRef.current = db;

  const patch = useCallback((partial: Partial<DbShape>) => {
    setDb((prev) => ({ ...prev, ...partial }));
  }, []);

  const reload = useCallback(async () => {
    const [users, companies, clients, documents, templates, reminders, audit] = await Promise.all([
      fetchAllSafe(api.users.list, { sortBy: 'fullName', sortOrder: 'asc' }),
      fetchAllSafe(api.companies.list, { sortBy: 'name', sortOrder: 'asc' }),
      fetchAllSafe(api.clients.list, { sortBy: 'createdAt', sortOrder: 'desc' }),
      fetchAllSafe(api.documents.list, { sortBy: 'createdAt', sortOrder: 'desc' }),
      fetchAllSafe(api.templates.list, { sortBy: 'title', sortOrder: 'asc' }),
      fetchAllSafe(api.reminders.list, { sortBy: 'date', sortOrder: 'desc' }),
      fetchAllSafe(api.audit.list, { sortBy: 'at', sortOrder: 'desc' }),
    ]);
    const settings = await api.settings.get().catch(() => dbRef.current.settings);
    patch({
      users: users.map((user) => ({ ...user, passwordHash: '' })),
      companies,
      clients,
      documents,
      templates,
      reminders,
      audit,
      settings,
    });
  }, [patch]);

  const reset = useCallback(() => setDb(blankDb()), []);

  // بارگذاری اولیه؛ در صورت نبود نشست معتبر، درخواست‌ها با خطای ۴۰۱ به‌آرامی
  // به فهرست خالی می‌رسند و AuthProvider پس از ورود reload را صدا می‌زند.
  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshAudit = useCallback(() => {
    void fetchAllSafe(api.audit.list, { sortBy: 'at', sortOrder: 'desc' }).then((audit) => patch({ audit }));
  }, [patch]);

  const refreshClient = useCallback(
    async (clientId: string) => {
      const detailed = await api.clients.get(clientId).catch(() => null);
      if (!detailed) return;
      setDb((prev) => ({
        ...prev,
        clients: upsert(prev.clients, detailed),
        workflowEvidence: [
          ...prev.workflowEvidence.filter((item) => item.clientId !== clientId),
          ...detailed.evidence,
        ],
      }));
    },
    [],
  );

  const refreshDocument = useCallback(
    async (documentId: string) => {
      const fresh = await api.documents.get(documentId).catch(() => null);
      if (fresh) setDb((prev) => ({ ...prev, documents: upsert(prev.documents, fresh) }));
    },
    [],
  );

  const actions = useMemo<DataActions>(() => {
    return {
      reload,
      reset,

      async loadDocumentScans(documentId) {
        const scans = await api.documents.scans(documentId).catch(() => [] as ScanFile[]);
        setDb((prev) => ({
          ...prev,
          scans: [...prev.scans.filter((scan) => scan.documentId !== documentId), ...scans],
        }));
      },

      async loadClientDetail(clientId) {
        await refreshClient(clientId);
      },

      /* ------------------------------ پرونده‌ها ------------------------------ */
      async saveClient(input, id) {
        const payload = {
          ...input,
          status: input.status ?? 'new',
          birthDate: normalizeClientBirthDate(input.birthDate),
        };
        const saved = id
          ? await api.clients.update(id, payload)
          : await api.clients.create(payload);
        setDb((prev) => ({ ...prev, clients: upsert(prev.clients, saved) }));
        refreshAudit();
        return saved;
      },

      async deleteClient(id) {
        await api.clients.remove(id);
        setDb((prev) => ({
          ...prev,
          clients: prev.clients.filter((item) => item.id !== id),
          workflowEvidence: prev.workflowEvidence.filter((item) => item.clientId !== id),
          documents: prev.documents.map((doc) =>
            doc.clientId === id ? { ...doc, clientId: undefined, clientName: undefined, clientCode: undefined } : doc,
          ),
        }));
        refreshAudit();
      },

      async addWorkflowEvidence(clientId, stepId, file) {
        const uploaded = await api.clients.uploadEvidence(clientId, stepId, file);
        await refreshClient(clientId);
        refreshAudit();
        return uploaded;
      },

      async completeWorkflowStep(clientId, stepId) {
        try {
          await api.clients.completeStep(clientId, stepId);
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
        await refreshClient(clientId);
        refreshAudit();
        return { ok: true };
      },

      async overrideWorkflowStep(clientId, stepId, reason) {
        if (!reason.trim()) return { ok: false, error: 'دلیل عبور از شرط مرحله را وارد کنید.' };
        try {
          await api.clients.overrideStep(clientId, stepId, reason.trim());
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
        await refreshClient(clientId);
        refreshAudit();
        return { ok: true };
      },

      /* -------------------------------- اسناد -------------------------------- */
      async createDocument(input) {
        const template = dbRef.current.templates.find((item) => item.id === input.templateId);
        const client = input.clientId
          ? dbRef.current.clients.find((item) => item.id === input.clientId)
          : undefined;
        const values = normalizeDocumentDateValues(
          template,
          { ...(template ? autofillValues(template, client) : {}), ...input.values },
        );
        const created = await api.documents.create({
          templateId: input.templateId,
          clientId: input.clientId ?? null,
          values,
          status: input.status,
          tags: input.tags,
          notes: input.notes,
        });
        setDb((prev) => ({ ...prev, documents: upsert(prev.documents, created) }));
        refreshAudit();
        return created;
      },

      async updateDocument(id, patchInput, _logAction) {
        const target = dbRef.current.documents.find((item) => item.id === id);
        const template = target ? dbRef.current.templates.find((item) => item.id === target.templateId) : undefined;
        const values = patchInput.values
          ? normalizeDocumentDateValues(template, patchInput.values)
          : undefined;
        const updated = await api.documents.update(id, {
          ...(patchInput.title !== undefined ? { title: patchInput.title } : {}),
          ...(values !== undefined ? { values } : {}),
          ...(patchInput.tags !== undefined ? { tags: patchInput.tags } : {}),
          ...(patchInput.notes !== undefined ? { notes: patchInput.notes } : {}),
        });
        setDb((prev) => ({ ...prev, documents: upsert(prev.documents, updated) }));
        refreshAudit();
      },

      async setDocumentStatus(id, status) {
        const updated = await api.documents.changeStatus(id, status);
        setDb((prev) => ({ ...prev, documents: upsert(prev.documents, updated) }));
        refreshAudit();
      },

      async markPrinted(id) {
        const updated = await api.documents.markPrinted(id);
        setDb((prev) => ({ ...prev, documents: upsert(prev.documents, updated) }));
        refreshAudit();
      },

      async deleteDocument(id) {
        await api.documents.remove(id);
        setDb((prev) => ({
          ...prev,
          documents: prev.documents.filter((item) => item.id !== id),
          scans: prev.scans.filter((scan) => scan.documentId !== id),
        }));
        refreshAudit();
      },

      /* ------------------------------- اسکن‌ها ------------------------------- */
      async addScan(documentId, file) {
        const compressed = await compressImage(file);
        const upload = new File([compressed], file.name, { type: compressed.type || file.type });
        const scan = await api.documents.uploadScan(documentId, upload);
        setDb((prev) => ({ ...prev, scans: upsert(prev.scans, scan) }));
        await refreshDocument(documentId);
        refreshAudit();
        return scan;
      },

      async deleteScan(scanId) {
        const scan = dbRef.current.scans.find((item) => item.id === scanId);
        if (!scan) return;
        await api.documents.deleteScan(scan.documentId, scanId);
        setDb((prev) => ({
          ...prev,
          scans: prev.scans.filter((item) => item.id !== scanId),
          documents: prev.documents.map((doc) =>
            doc.id === scan.documentId ? { ...doc, scanIds: doc.scanIds.filter((sid) => sid !== scanId) } : doc,
          ),
        }));
        refreshAudit();
      },

      /* ------------------------------- قالب‌ها ------------------------------ */
      async saveTemplate(input, id) {
        const saved = id ? await api.templates.update(id, input) : await api.templates.create(input);
        setDb((prev) => ({ ...prev, templates: upsert(prev.templates, saved) }));
        refreshAudit();
        return saved;
      },

      async duplicateTemplate(id) {
        const created = await api.templates.duplicate(id).catch(() => null);
        if (created) {
          setDb((prev) => ({ ...prev, templates: upsert(prev.templates, created) }));
          refreshAudit();
        }
        return created;
      },

      async deleteTemplate(id) {
        await api.templates.remove(id);
        setDb((prev) => ({
          ...prev,
          templates: prev.templates.filter((item) => item.id !== id),
        }));
        refreshAudit();
      },

      /* ------------------------------- کاربران ------------------------------ */
      async saveUser(input, id) {
        try {
          const saved = id
            ? await api.users.update(id, input)
            : await api.users.create(input);
          setDb((prev) => ({ ...prev, users: upsert(prev.users, { ...saved, passwordHash: '' }) }));
          refreshAudit();
          return { ok: true, user: { ...saved, passwordHash: '' } };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },

      async deleteUser(id) {
        try {
          await api.users.remove(id);
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
        setDb((prev) => ({ ...prev, users: prev.users.filter((item) => item.id !== id) }));
        refreshAudit();
        return { ok: true };
      },

      async toggleUserActive(id) {
        const target = dbRef.current.users.find((item) => item.id === id);
        if (!target) return;
        const updated = await api.users.setActive(id, !target.active).catch(() => null);
        if (updated) {
          setDb((prev) => ({ ...prev, users: upsert(prev.users, { ...updated, passwordHash: '' }) }));
          refreshAudit();
        }
      },

      /* ------------------------------ مجموعه‌ها ----------------------------- */
      async saveCompany(input, id) {
        const payload = { ...input, name: input.name.trim() };
        const saved = id ? await api.companies.update(id, payload) : await api.companies.create(payload);
        setDb((prev) => ({ ...prev, companies: upsert(prev.companies, saved) }));
        refreshAudit();
        return saved;
      },

      async deleteCompany(id) {
        const detached = dbRef.current.users.filter((user) => user.companyId === id).length;
        try {
          await api.companies.remove(id);
        } catch (error) {
          return { ok: false, error: errorMessage(error), detached: 0 };
        }
        setDb((prev) => ({
          ...prev,
          companies: prev.companies.filter((item) => item.id !== id),
          users: prev.users.map((user) => (user.companyId === id ? { ...user, companyId: undefined } : user)),
        }));
        refreshAudit();
        return { ok: true, detached };
      },

      async setCompanyMembers(companyId, userIds) {
        try {
          const result = await api.companies.setMembers(companyId, userIds);
          const wanted = new Set(userIds);
          setDb((prev) => ({
            ...prev,
            users: prev.users.map((user) =>
              wanted.has(user.id)
                ? { ...user, companyId }
                : user.companyId === companyId
                  ? { ...user, companyId: undefined }
                  : user,
            ),
          }));
          refreshAudit();
          return { ok: true, added: result.added, removed: result.removed };
        } catch (error) {
          return { ok: false, error: errorMessage(error), added: 0, removed: 0 };
        }
      },

      /* ------------------------------- یادآورها ------------------------------ */
      async createReminder(input) {
        const title = input.title.trim();
        if (!title) return { ok: false, error: 'متن یادآور را بنویسید.' };
        const date = normalizeJalaliDate(input.date);
        if (!date) return { ok: false, error: 'تاریخ یادآور باید شمسی و به‌شکل YYYY/MM/DD باشد.' };
        const time = input.time?.trim() ? (normalizeReminderTime(input.time) ?? undefined) : undefined;
        if (input.time?.trim() && !time) return { ok: false, error: 'ساعت یادآور باید به‌شکل HH:MM باشد.' };
        try {
          const reminder = await api.reminders.create({ title, note: input.note, date, time, userId: input.userId });
          setDb((prev) => ({ ...prev, reminders: upsert(prev.reminders, reminder) }));
          refreshAudit();
          return { ok: true, reminder };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },

      async markReminderDone(id) {
        const updated = await api.reminders.markDone(id).catch(() => null);
        if (updated) {
          setDb((prev) => ({ ...prev, reminders: upsert(prev.reminders, updated) }));
          refreshAudit();
        }
      },

      async deleteReminder(id) {
        await api.reminders.remove(id);
        setDb((prev) => ({ ...prev, reminders: prev.reminders.filter((item) => item.id !== id) }));
        refreshAudit();
      },

      /* ------------------------------ تنظیمات ----------------------------- */
      async updateSettings(patchInput) {
        const updated = await api.settings.update(patchInput);
        setDb((prev) => ({ ...prev, settings: updated }));
        refreshAudit();
      },

      /* -------------------------------- سربرگ ------------------------------- */
      async saveLetterheadAddress(address) {
        try {
          const config = await api.letterhead.update({ address });
          refreshAudit();
          return { ok: true, config };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },

      async recordLetterheadPrint(input) {
        try {
          await api.letterhead.recordPrint(input);
          refreshAudit();
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },

      async clearAudit() {
        await api.audit.clear();
        setDb((prev) => ({ ...prev, audit: [] }));
      },

      async exportBackup() {
        const dump = await api.backup.export();
        return JSON.stringify(dump, null, 2);
      },

      async importBackup(json) {
        try {
          const parsed = JSON.parse(json) as unknown;
          await api.backup.import(parsed);
          await reload();
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },
    };
  }, [patch, reload, reset, refreshAudit, refreshClient, refreshDocument]);

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
