/* داده‌های نمونه برای اجرای اول.
   این داده‌ها فقط برای این هستند که برنامه از همان ابتدا قابل استفاده و
   بررسی باشد؛ با «بازنشانی داده‌ها» در تنظیمات پاک می‌شوند. */

import type {
  AppSettings,
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
import { hashPassword } from '../lib/crypto';
import { jalaliDateFromDate } from '../lib/jalali';
import { nowISO, sequenceNumber } from '../lib/format';
import { createClientWorkflow } from '../lib/caseWorkflow';
import { autofillValues } from '../lib/template';
import { PRESET_ROLES } from './permissions';
import { SEED_TEMPLATES } from './templates';

export const DEMO_ACCOUNTS = [
  { username: 'superadmin', password: 'super123', label: 'مدیر ارشد — دسترسی کامل' },
  { username: 'admin', password: 'admin123', label: 'مدیر — کارشناس پرونده' },
  { username: 'marzieh', password: 'marzieh123', label: 'مدیر — کارشناس قرارداد' },
  { username: 'reza', password: 'reza123', label: 'مدیر — فقط‌خواندنی' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  orgName: 'املاک آرین',
  orgLegalName: 'مشاور املاک آرین',
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

function daysAgo(days: number, hourOffset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + hourOffset, 30, 0, 0);
  return date.toISOString();
}

function jalaliDaysAgo(days: number): string {
  return jalaliDateFromDate(new Date(daysAgo(days)));
}

function presetPermissions(id: string): string[] {
  return PRESET_ROLES.find((role) => role.id === id)?.permissions ?? [];
}

/* ------------------------------- کاربران ------------------------------- */

const USERS: User[] = [
  {
    id: 'u-super',
    username: 'superadmin',
    fullName: 'سارا رضایی',
    passwordHash: hashPassword('super123'),
    role: 'superadmin',
    permissions: ['*'],
    title: 'مدیر ارشد شعبه',
    mobile: '09121234567',
    active: true,
    createdAt: daysAgo(180),
    lastLoginAt: daysAgo(0, 1),
    note: 'حساب اصلی سامانه — غیرفعال‌سازی توصیه نمی‌شود.',
  },
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'علی محمدی',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    permissions: presetPermissions('preset-operator'),
    title: 'کارشناس پرونده',
    mobile: '09123456789',
    companyId: 'co-1',
    active: true,
    createdAt: daysAgo(150),
    lastLoginAt: daysAgo(0, 2),
  },
  {
    id: 'u-contracts',
    username: 'marzieh',
    fullName: 'مرضیه صادقی',
    passwordHash: hashPassword('marzieh123'),
    role: 'admin',
    permissions: presetPermissions('preset-contracts'),
    title: 'کارشناس قرارداد',
    mobile: '09351112233',
    companyId: 'co-2',
    active: true,
    createdAt: daysAgo(120),
    lastLoginAt: daysAgo(1, 3),
  },
  {
    id: 'u-viewer',
    username: 'reza',
    fullName: 'رضا کریمی',
    passwordHash: hashPassword('reza123'),
    role: 'admin',
    permissions: presetPermissions('preset-viewer'),
    title: 'مشاور فروش',
    mobile: '09197778899',
    active: true,
    createdAt: daysAgo(60),
    lastLoginAt: daysAgo(4),
  },
  {
    id: 'u-archive',
    username: 'narges',
    fullName: 'نرگس بیات',
    passwordHash: hashPassword('narges123'),
    role: 'admin',
    permissions: ['dashboard.view', 'documents.view', 'documents.upload', 'documents.status', 'clients.view'],
    title: 'مسئول بایگانی',
    mobile: '09361234567',
    companyId: 'co-3',
    active: false,
    createdAt: daysAgo(30),
    note: 'برای تست حالت غیرفعال — دسترسی بایگانی اسکن‌ها',
  },
];

/* ------------------------------ پرونده‌ها ------------------------------ */

export const SEED_CLIENTS: Client[] = [
  {
    id: 'cl-1',
    code: sequenceNumber(DEFAULT_SETTINGS.clientPrefix, 1),
    fullName: 'نمونه آزمایشی یک',
    nationalId: '0123456789',
    mobile: '09120000001',
    phone: '02100000001',
    fatherName: 'نمونه',
    birthDate: '1370/01/01',
    residenceAddress: 'نشانی آزمایشی شماره یک، تهران',
    caseType: 'document_request',
    workflow: createClientWorkflow('document_request'),
    status: 'new',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    createdBy: 'u-admin',
  },
  {
    id: 'cl-2',
    code: sequenceNumber(DEFAULT_SETTINGS.clientPrefix, 2),
    fullName: 'نمونه آزمایشی دو',
    nationalId: '0123456789',
    mobile: '09120000002',
    fatherName: 'آزمایش',
    birthDate: '1375/05/10',
    residenceAddress: 'نشانی آزمایشی شماره دو، تهران',
    caseType: 'document_request',
    workflow: createClientWorkflow('document_request'),
    status: 'in_progress',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    createdBy: 'u-admin',
  },
];

/* -------------------------------- اسناد -------------------------------- */

const templateById = (id: string): FormTemplate => {
  const template = SEED_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`قالب یافت نشد: ${id}`);
  return template;
};

interface DocSeed {
  templateId: string;
  clientId?: string;
  status: DocStatus;
  ago: number;
  overrides?: Record<string, string>;
  scans?: number;
  createdBy?: string;
  tags?: string[];
  notes?: string;
}

const DOC_SEEDS: DocSeed[] = [
  {
    templateId: 'tpl-sale',
    clientId: 'cl-1',
    status: 'scanned',
    ago: 22,
    scans: 2,
    createdBy: 'u-admin',
    overrides: {
      doc_date: jalaliDaysAgo(22),
      payment_terms: '۱ میلیارد تومان نقد در زمان امضا، ۲ میلیارد تومان هنگام تنظیم سند رسمی، الباقی با چک ۹۰ روزه.',
      notary_office: 'دفتر اسناد رسمی ۲۳ تهران',
      extra_terms: 'کلیه لوازم برقی و کابینت‌ها جزء مورد معامله است.',
      delivery_date: jalaliDaysAgo(-8),
    },
    tags: ['معامله بزرگ'],
  },
  {
    templateId: 'tpl-sale',
    clientId: 'cl-2',
    status: 'awaiting_signature',
    ago: 9,
    scans: 0,
    createdBy: 'u-admin',
    overrides: {
      doc_date: jalaliDaysAgo(9),
      payment_terms: 'کل مبلغ به‌صورت نقدی در دفتر اسناد رسمی پرداخت می‌شود.',
      notary_office: 'دفتر اسناد رسمی ۱۰۱ تهران',
      extra_terms: 'خریدار متعهد به پرداخت هزینه انتقال و دفترخانه است.',
    },
  },
  {
    templateId: 'tpl-rent',
    clientId: 'cl-2',
    status: 'signed',
    ago: 15,
    scans: 1,
    createdBy: 'u-contracts',
    overrides: {
      doc_date: jalaliDaysAgo(15),
      start_date: jalaliDaysAgo(10),
      end_date: jalaliDaysAgo(-355),
      duration_months: '12',
      payment_day: '5',
      utilities_note: 'قبوض آب، برق و گاز و شارژ ساختمان بر عهده مستأجر است.',
      pets_allowed: 'false',
      extra_terms: 'یک پارکینگ و یک انباری به مستأجر تعلق دارد.',
    },
  },
  {
    templateId: 'tpl-rent',
    clientId: 'cl-2',
    status: 'draft',
    ago: 3,
    scans: 0,
    createdBy: 'u-admin',
    overrides: { doc_date: jalaliDaysAgo(3), duration_months: '12' },
  },
  {
    templateId: 'tpl-commission',
    clientId: 'cl-1',
    status: 'scanned',
    ago: 21,
    scans: 1,
    createdBy: 'u-admin',
    overrides: {
      doc_date: jalaliDaysAgo(21),
      commission_amount: '84000000',
      deal_type: 'فروش',
      payment_method: 'کارت به کارت',
      due_date: jalaliDaysAgo(-2),
      extra_terms: 'کمیسیون در دو قسط از طرفین معامله دریافت می‌شود.',
    },
  },
  {
    templateId: 'tpl-visit',
    clientId: 'cl-1',
    status: 'signed',
    ago: 30,
    scans: 0,
    createdBy: 'u-contracts',
    overrides: {
      doc_date: jalaliDaysAgo(30),
      visit_date: jalaliDaysAgo(31),
      visit_time: '۱۷:۰۰',
      visit_result: 'مورد پسند بود',
      visitor_note: 'متقاضی برای بررسی قیمت و مشورت با خانواده یک هفته فرصت خواست.',
    },
  },
  {
    templateId: 'tpl-presale',
    clientId: 'cl-2',
    status: 'awaiting_signature',
    ago: 6,
    scans: 0,
    createdBy: 'u-contracts',
    tags: ['پرداخت مرحله‌ای'],
    overrides: {
      doc_date: jalaliDaysAgo(6),
      unit_no: '۱۴',
      unit_area: '118',
      total_units: '24',
      payment_steps: '۳ میلیارد تومان عند‌الامضا، ۴ میلیارد تومان پس از اتمام سفت‌کاری، ۵.۵ میلیارد تومان زمان تحویل.',
      delivery_date: jalaliDaysAgo(-540),
      extra_terms: 'کلیه عوارض و هزینه‌های تفکیک بر عهده سازنده است.',
    },
  },
  {
    templateId: 'tpl-handover',
    clientId: 'cl-2',
    status: 'scanned',
    ago: 40,
    scans: 2,
    createdBy: 'u-admin',
    overrides: {
      doc_date: jalaliDaysAgo(40),
      delivery_date: jalaliDaysAgo(41),
      electricity_meter: '۷۸۴۵۱۲',
      gas_meter: '۱۲۰۹۸۷',
      water_meter: '۴۵۶۷۸۹',
      keys_count: '3',
      rent_status: 'تسویه کامل',
      damages: 'دو عدد لامپ هال سوخته و یک دستگیره شکسته — با توافق از ودیعه کسر نشد.',
    },
  },
  {
    templateId: 'tpl-commission',
    clientId: 'cl-1',
    status: 'scanned',
    ago: 52,
    scans: 1,
    createdBy: 'u-contracts',
    overrides: {
      doc_date: jalaliDaysAgo(52),
      commission_amount: '320000000',
      deal_type: 'رهن کامل',
      payment_method: 'چک',
      extra_terms: 'کمیسیون مطابق تعرفه اتحادیه در دو قسط ۳۰ و ۶۰ روزه دریافت شد.',
    },
  },
  {
    templateId: 'tpl-visit',
    clientId: 'cl-2',
    status: 'archived',
    ago: 62,
    scans: 0,
    createdBy: 'u-admin',
    overrides: {
      doc_date: jalaliDaysAgo(62),
      visit_date: jalaliDaysAgo(63),
      visit_result: 'مورد پسند نبود',
      visitor_note: 'نورگیری واحد مناسب نبود؛ پرونده بایگانی شد.',
    },
  },
  {
    templateId: 'tpl-sale',
    clientId: 'cl-1',
    status: 'draft',
    ago: 1,
    scans: 0,
    createdBy: 'u-admin',
    overrides: { doc_date: jalaliDaysAgo(1) },
  },
];

const SCAN_LABELS = ['صفحه ۱ — اصل امضاشده', 'صفحه ۲ — پیوست مدارک', 'پیوست شناسنامه'];

function buildDocuments(): { documents: DocRecord[]; scans: ScanFile[] } {
  const documents: DocRecord[] = [];
  const scans: ScanFile[] = [];
  DOC_SEEDS.forEach((seed, index) => {
    const template = templateById(seed.templateId);
    const client = seed.clientId ? SEED_CLIENTS.find((item) => item.id === seed.clientId) : undefined;
    const author = USERS.find((user) => user.id === seed.createdBy) ?? USERS[1];
    const createdAt = daysAgo(seed.ago, index % 5);
    const scanIds: string[] = [];
    for (let page = 0; page < (seed.scans ?? 0); page += 1) {
      const scanId = `scan-${index + 1}-${page + 1}`;
      scanIds.push(scanId);
      scans.push({
        id: scanId,
        documentId: `doc-${index + 1}`,
        name: `${template.title} — ${SCAN_LABELS[page % SCAN_LABELS.length]}.jpg`,
        mime: 'image/jpeg',
        size: 320_000 + page * 45_000,
        blobKey: `demo://${scanId}`,
        pages: 1,
        uploadedAt: daysAgo(Math.max(0, seed.ago - 2), page),
        uploadedBy: author.fullName,
      });
    }
    documents.push({
      id: `doc-${index + 1}`,
      number: sequenceNumber(DEFAULT_SETTINGS.docPrefix, index + 1),
      title: template.title,
      templateId: template.id,
      templateTitle: template.title,
      templateVersion: template.version,
      clientId: client?.id,
      clientName: client?.fullName,
      clientCode: client?.code,
      values: { ...autofillValues(template, client), ...(seed.overrides ?? {}) },
      status: seed.status,
      tags: seed.tags ?? [],
      notes: seed.notes,
      createdAt,
      updatedAt: daysAgo(Math.max(0, seed.ago - 1)),
      createdBy: author.id,
      createdByName: author.fullName,
      printedAt: seed.status === 'draft' ? undefined : createdAt,
      signedAt: seed.status === 'signed' || seed.status === 'scanned' ? daysAgo(Math.max(0, seed.ago - 1)) : undefined,
      scanIds,
    });
  });
  return { documents, scans };
}

/* ------------------------------ مجموعه‌ها ------------------------------ */

export const SEED_COMPANIES: Company[] = [
  {
    id: 'co-1',
    name: 'مجموعه زمین‌های آرین‌باغ',
    kind: 'owner',
    nationalId: '10102345678',
    managerName: 'مهندس کریمی',
    mobile: '09121234501',
    phone: '021-88997700',
    address: 'تهران، کیلومتر ۲۵ جاده مخصوص، ورودی آرین‌باغ',
    plotCount: 148,
    totalArea: 265_000,
    active: true,
    createdAt: daysAgo(170),
    updatedAt: daysAgo(88),
    createdBy: 'u-super',
    note: 'قطعه‌های ۱ تا ۱۴۸ — دفتر مجموعه در ورودی اصلی است.',
  },
  {
    id: 'co-2',
    name: 'تعاونی مسکن سبزینه',
    kind: 'cooperative',
    nationalId: '10109876543',
    managerName: 'زهرا احمدی',
    mobile: '09351120112',
    phone: '021-44556677',
    address: 'تهران، شهرک صنعتی، بلوار سبزینه، ساختمان اداری',
    plotCount: 62,
    totalArea: 94_000,
    active: true,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(60),
    createdBy: 'u-super',
  },
  {
    id: 'co-3',
    name: 'شرکت عمران دشت‌پردیس',
    kind: 'developer',
    nationalId: '10105566778',
    managerName: 'مرضیه صادقی',
    mobile: '09364440119',
    phone: '021-22334455',
    address: 'تهران، بلوار پردیس، مجتمع اداری پارس، طبقه ۴',
    plotCount: 210,
    totalArea: 410_000,
    active: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(35),
    createdBy: 'u-super',
    note: 'فرم‌های واگذاری باید با سرصفحه رسمی شرکت تنظیم شود.',
  },
  {
    id: 'co-4',
    name: 'بنیاد زمین‌های کشور',
    kind: 'org',
    managerName: 'واحد املاک',
    phone: '021-33445566',
    address: 'تهران، خیابان استاد نجات‌اللهی، ساختمان بنیاد',
    plotCount: 88,
    totalArea: 180_000,
    active: false,
    createdAt: daysAgo(95),
    updatedAt: daysAgo(14),
    createdBy: 'u-super',
    note: 'در حال تمدید قرارداد همکاری — فعلاً غیرفعال.',
  },
  {
    id: 'co-5',
    name: 'سرمایه‌گذاری نیک‌باغ',
    kind: 'investor',
    managerName: 'بابک فتحی',
    mobile: '09121117701',
    address: 'تهران، سعادت‌آباد، برج نیکان، طبقه ۱۲',
    plotCount: 34,
    totalArea: 52_500,
    active: true,
    createdAt: daysAgo(70),
    updatedAt: daysAgo(9),
    createdBy: 'u-super',
  },
];

/* ------------------------------ گزارش کار ------------------------------ */

const AUDIT_SEED: Array<Omit<AuditEntry, 'id' | 'at'> & { ago: number }> = [
  { ago: 0, userId: 'u-super', userName: 'سارا رضایی', action: 'ورود به سامانه', entity: 'auth' },
  { ago: 1, userId: 'u-admin', userName: 'علی محمدی', action: 'ایجاد سند', entity: 'document', entityId: 'doc-11', entityLabel: 'مبایعه‌نامه ملک مسکونی' },
  { ago: 1, userId: 'u-admin', userName: 'علی محمدی', action: 'ایجاد پرونده', entity: 'client', entityId: 'cl-2', entityLabel: 'نمونه آزمایشی دو' },
  { ago: 2, userId: 'u-contracts', userName: 'مرضیه صادقی', action: 'بارگذاری اسکن امضاشده', entity: 'scan', entityId: 'scan-8-1', entityLabel: 'صورتجلسه تحویل و تخلیه ملک' },
  { ago: 3, userId: 'u-admin', userName: 'علی محمدی', action: 'چاپ سند', entity: 'document', entityId: 'doc-4', entityLabel: 'اجاره‌نامه ملک مسکونی' },
  { ago: 5, userId: 'u-super', userName: 'سارا رضایی', action: 'ویرایش دسترسی کاربر', entity: 'user', entityId: 'u-viewer', entityLabel: 'رضا کریمی', detail: 'افزودن دسترسی مشاهده گزارش‌ها' },
  { ago: 6, userId: 'u-contracts', userName: 'مرضیه صادقی', action: 'ایجاد سند', entity: 'document', entityId: 'doc-7', entityLabel: 'قرارداد پیش‌فروش واحد ساختمانی' },
  { ago: 8, userId: 'u-super', userName: 'سارا رضایی', action: 'افزودن قالب فرم', entity: 'template', entityId: 'tpl-handover', entityLabel: 'صورتجلسه تحویل و تخلیه ملک' },
  { ago: 9, userId: 'u-admin', userName: 'علی محمدی', action: 'ویرایش پرونده', entity: 'client', entityId: 'cl-1', entityLabel: 'نمونه آزمایشی یک' },
  { ago: 12, userId: 'u-super', userName: 'سارا رضایی', action: 'ایجاد کاربر', entity: 'user', entityId: 'u-archive', entityLabel: 'نرگس بیات' },
  { ago: 13, userId: 'u-super', userName: 'سارا رضایی', action: 'ویرایش مجموعه', entity: 'company', entityId: 'co-3', entityLabel: 'شرکت عمران دشت‌پردیس', detail: 'به‌روزرسانی رابط و متراژ کل' },
  { ago: 16, userId: 'u-super', userName: 'سارا رضایی', action: 'اتصال کاربر به مجموعه', entity: 'company', entityId: 'co-2', entityLabel: 'تعاونی مسکن سبزینه', detail: 'مرضیه صادقی' },
  { ago: 14, userId: 'u-admin', userName: 'علی محمدی', action: 'تغییر وضعیت سند', entity: 'document', entityId: 'doc-1', entityLabel: 'مبایعه‌نامه ملک مسکونی', detail: 'در انتظار امضا → اسکن‌شده' },
  { ago: 18, userId: 'u-contracts', userName: 'مرضیه صادقی', action: 'تغییر وضعیت سند', entity: 'document', entityId: 'doc-3', entityLabel: 'اجاره‌نامه ملک مسکونی', detail: 'پیش‌نویس → امضاشده' },
];

const CUSTOM_ROLES: PermissionRole[] = [
  {
    id: 'role-archive',
    name: 'مسئول بایگانی اسکن',
    description: 'فقط مشاهده اسناد و بارگذاری اسکن امضاشده',
    permissions: ['dashboard.view', 'documents.view', 'documents.upload', 'documents.status', 'clients.view'],
    createdAt: daysAgo(20),
    createdBy: 'u-super',
  },
];

/** ساخت داده‌های اولیه کامل */
export function buildSeedDb(): DbShape {
  const { documents, scans } = buildDocuments();
  return {
    users: USERS,
    companies: SEED_COMPANIES,
    clients: SEED_CLIENTS.map((client) => ({
      ...client,
      caseType: 'document_request',
      workflow: createClientWorkflow('document_request'),
    })),
    documents,
    templates: SEED_TEMPLATES,
    roles: [...PRESET_ROLES, ...CUSTOM_ROLES],
    scans,
    workflowEvidence: [],
    audit: AUDIT_SEED.map((entry, index) => ({
      id: `log-${index + 1}`,
      at: daysAgo(entry.ago, index % 7),
      userId: entry.userId,
      userName: entry.userName,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      detail: entry.detail,
    })),
    settings: DEFAULT_SETTINGS,
  };
}

export const SEED_TIMESTAMP = nowISO();
