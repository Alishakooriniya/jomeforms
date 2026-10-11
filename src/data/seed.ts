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
import { nowISO, sequenceNumber } from '../lib/format';
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

let clientSeq = 0;

type ClientSeed = Partial<Client> &
  Pick<Client, 'fullName' | 'partyRole' | 'dealKind' | 'address'>;

function makeClient(data: ClientSeed): Client {
  clientSeq += 1;
  const created = daysAgo(95 - clientSeq * 9, clientSeq % 6);
  return {
    id: `cl-${clientSeq}`,
    code: sequenceNumber(DEFAULT_SETTINGS.clientPrefix, clientSeq),
    nationalId: '',
    mobile: '',
    province: DEFAULT_SETTINGS.defaultProvince,
    city: DEFAULT_SETTINGS.defaultCity,
    propertyKind: 'apartment',
    area: 0,
    price: 0,
    deposit: 0,
    rent: 0,
    commissionPercent: 0.5,
    status: 'new',
    tags: [],
    extra: {},
    createdAt: created,
    updatedAt: created,
    createdBy: 'u-admin',
    ...data,
  };
}

const CLIENTS: Client[] = [
  makeClient({
    fullName: 'مهدی رستگار',
    nationalId: '2291745638',
    mobile: '09121230011',
    fatherName: 'اکبر',
    birthDate: '1985-04-12',
    partyRole: 'seller',
    party2Name: 'زهرا احمدی',
    party2Role: 'buyer',
    party2NationalId: '0084575948',
    party2Mobile: '09351120022',
    dealKind: 'sale',
    status: 'in_progress',
    address: 'تهران، خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳',
    region: 'ولیعصر',
    propertyKind: 'apartment',
    area: 92,
    plate: '۳/۱۲۴۵۸',
    unit: '۳',
    floor: '۲',
    buildYear: '1396',
    price: 8_400_000_000,
    deposit: 1_200_000_000,
    commissionPercent: 0.5,
    agentName: 'علی محمدی',
    source: 'تماس تلفنی',
    tags: ['فوری', 'وام‌دار'],
    notes: 'خریدار برای تسویه به فروش آپارتمان خود وابسته است.',
  }),
  makeClient({
    fullName: 'زهرا احمدی',
    nationalId: '0084575948',
    mobile: '09351120022',
    fatherName: 'منصور',
    partyRole: 'buyer',
    dealKind: 'sale',
    status: 'new',
    address: 'تهران، سعادت‌آباد، بلوار دریا، پلاک ۸۸، واحد ۱۱',
    region: 'سعادت‌آباد',
    propertyKind: 'apartment',
    area: 85,
    price: 7_200_000_000,
    commissionPercent: 0.5,
    agentName: 'رضا کریمی',
    tags: ['نقدی'],
  }),
  makeClient({
    fullName: 'حسین نوری',
    nationalId: '1250968739',
    mobile: '09193440055',
    partyRole: 'landlord',
    party2Name: 'سمیرا موسوی',
    party2Role: 'tenant',
    party2NationalId: '3645129081',
    party2Mobile: '09122340066',
    dealKind: 'rent',
    status: 'awaiting_docs',
    address: 'تهران، خیابان شریعتی، خیابان یخچال، پلاک ۴۵، واحد ۶',
    region: 'قلهک',
    propertyKind: 'apartment',
    area: 105,
    unit: '۶',
    floor: '۳',
    buildYear: '1392',
    deposit: 500_000_000,
    rent: 35_000_000,
    commissionPercent: 0.25,
    agentName: 'علی محمدی',
    tags: ['اجاره یک‌ساله'],
    notes: 'مدارک هویتی مستأجر در انتظار تحویل است.',
  }),
  makeClient({
    fullName: 'سمیرا موسوی',
    nationalId: '3645129081',
    mobile: '09122340066',
    partyRole: 'tenant',
    dealKind: 'rent',
    status: 'done',
    address: 'تهران، شریعتی، قلهک، پلاک ۴۵، واحد ۶',
    region: 'قلهک',
    area: 105,
    deposit: 500_000_000,
    rent: 35_000_000,
    commissionPercent: 0.25,
    agentName: 'علی محمدی',
    tags: [],
  }),
  makeClient({
    fullName: 'امیرحسین طاهری',
    nationalId: '0079543219',
    mobile: '09128889977',
    partyRole: 'buyer',
    dealKind: 'presale',
    status: 'in_progress',
    address: 'تهران، منطقه ۲۲، بلوار اردستانی، پروژه نگین',
    region: 'چیتگر',
    propertyKind: 'apartment',
    area: 118,
    unit: '۱۴',
    floor: '۵',
    price: 12_500_000_000,
    deposit: 3_000_000_000,
    commissionPercent: 0.5,
    agentName: 'مرضیه صادقی',
    tags: ['پیش‌فروش', 'پرداخت مرحله‌ای'],
  }),
  makeClient({
    fullName: 'فاطمه شریفی',
    nationalId: '1892037653',
    mobile: '09364445566',
    partyRole: 'seller',
    dealKind: 'sale',
    status: 'done',
    address: 'کرج، عظیمیه، بلوار اصلی، کوچه گلستان، پلاک ۷',
    city: 'کرج',
    province: 'البرز',
    region: 'عظیمیه',
    propertyKind: 'house',
    area: 240,
    plate: '۲/۹۸۷۶',
    buildYear: '1388',
    price: 15_800_000_000,
    commissionPercent: 0.5,
    agentName: 'رضا کریمی',
    tags: ['معامله نهایی‌شده'],
  }),
  makeClient({
    fullName: 'بابک فتحی',
    nationalId: '0451209869',
    mobile: '09121117788',
    partyRole: 'seller',
    dealKind: 'sale',
    status: 'new',
    address: 'تهران، خیابان جمهوری، پاساژ نور، طبقه اول، واحد ۱۲',
    region: 'جمهوری',
    propertyKind: 'store',
    area: 32,
    plate: '۴/۵۵۶۷۸',
    price: 9_900_000_000,
    commissionPercent: 0.75,
    agentName: 'علی محمدی',
    tags: ['تجاری'],
    notes: 'سند تجاری با کاربری مغازه.',
  }),
  makeClient({
    fullName: 'نگار سلطانی',
    nationalId: '2349876519',
    mobile: '09353330011',
    partyRole: 'buyer',
    dealKind: 'mortgage',
    status: 'archived',
    address: 'تهران، لواسان، بلوار امام خمینی، کوچه چنار، پلاک ۳',
    region: 'لواسان',
    propertyKind: 'villa',
    area: 310,
    price: 32_000_000_000,
    deposit: 8_000_000_000,
    commissionPercent: 1,
    agentName: 'مرضیه صادقی',
    tags: ['رهن کامل', 'بایگانی‌شده'],
  }),
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
      doc_date: daysAgo(22).slice(0, 10),
      payment_terms: '۱ میلیارد تومان نقد در زمان امضا، ۲ میلیارد تومان هنگام تنظیم سند رسمی، الباقی با چک ۹۰ روزه.',
      notary_office: 'دفتر اسناد رسمی ۲۳ تهران',
      extra_terms: 'کلیه لوازم برقی و کابینت‌ها جزء مورد معامله است.',
      delivery_date: daysAgo(-8).slice(0, 10),
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
      doc_date: daysAgo(9).slice(0, 10),
      payment_terms: 'کل مبلغ به‌صورت نقدی در دفتر اسناد رسمی پرداخت می‌شود.',
      notary_office: 'دفتر اسناد رسمی ۱۰۱ تهران',
      extra_terms: 'خریدار متعهد به پرداخت هزینه انتقال و دفترخانه است.',
    },
  },
  {
    templateId: 'tpl-rent',
    clientId: 'cl-3',
    status: 'signed',
    ago: 15,
    scans: 1,
    createdBy: 'u-contracts',
    overrides: {
      doc_date: daysAgo(15).slice(0, 10),
      start_date: daysAgo(10).slice(0, 10),
      end_date: daysAgo(-355).slice(0, 10),
      duration_months: '12',
      payment_day: '5',
      utilities_note: 'قبوض آب، برق و گاز و شارژ ساختمان بر عهده مستأجر است.',
      pets_allowed: 'false',
      extra_terms: 'یک پارکینگ و یک انباری به مستأجر تعلق دارد.',
    },
  },
  {
    templateId: 'tpl-rent',
    clientId: 'cl-4',
    status: 'draft',
    ago: 3,
    scans: 0,
    createdBy: 'u-admin',
    overrides: { doc_date: daysAgo(3).slice(0, 10), duration_months: '12' },
  },
  {
    templateId: 'tpl-commission',
    clientId: 'cl-1',
    status: 'scanned',
    ago: 21,
    scans: 1,
    createdBy: 'u-admin',
    overrides: {
      doc_date: daysAgo(21).slice(0, 10),
      commission_amount: '84000000',
      deal_type: 'فروش',
      payment_method: 'کارت به کارت',
      due_date: daysAgo(-2).slice(0, 10),
      extra_terms: 'کمیسیون در دو قسط از طرفین معامله دریافت می‌شود.',
    },
  },
  {
    templateId: 'tpl-visit',
    clientId: 'cl-6',
    status: 'signed',
    ago: 30,
    scans: 0,
    createdBy: 'u-contracts',
    overrides: {
      doc_date: daysAgo(30).slice(0, 10),
      visit_date: daysAgo(31).slice(0, 10),
      visit_time: '۱۷:۰۰',
      visit_result: 'مورد پسند بود',
      visitor_note: 'متقاضی برای بررسی قیمت و مشورت با خانواده یک هفته فرصت خواست.',
    },
  },
  {
    templateId: 'tpl-presale',
    clientId: 'cl-5',
    status: 'awaiting_signature',
    ago: 6,
    scans: 0,
    createdBy: 'u-contracts',
    tags: ['پرداخت مرحله‌ای'],
    overrides: {
      doc_date: daysAgo(6).slice(0, 10),
      unit_no: '۱۴',
      unit_area: '118',
      total_units: '24',
      payment_steps: '۳ میلیارد تومان عند‌الامضا، ۴ میلیارد تومان پس از اتمام سفت‌کاری، ۵.۵ میلیارد تومان زمان تحویل.',
      delivery_date: daysAgo(-540).slice(0, 10),
      extra_terms: 'کلیه عوارض و هزینه‌های تفکیک بر عهده سازنده است.',
    },
  },
  {
    templateId: 'tpl-handover',
    clientId: 'cl-4',
    status: 'scanned',
    ago: 40,
    scans: 2,
    createdBy: 'u-admin',
    overrides: {
      doc_date: daysAgo(40).slice(0, 10),
      delivery_date: daysAgo(41).slice(0, 10),
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
    clientId: 'cl-8',
    status: 'scanned',
    ago: 52,
    scans: 1,
    createdBy: 'u-contracts',
    overrides: {
      doc_date: daysAgo(52).slice(0, 10),
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
      doc_date: daysAgo(62).slice(0, 10),
      visit_date: daysAgo(63).slice(0, 10),
      visit_result: 'مورد پسند نبود',
      visitor_note: 'نورگیری واحد مناسب نبود؛ پرونده بایگانی شد.',
    },
  },
  {
    templateId: 'tpl-sale',
    clientId: 'cl-7',
    status: 'draft',
    ago: 1,
    scans: 0,
    createdBy: 'u-admin',
    overrides: { doc_date: daysAgo(1).slice(0, 10) },
  },
];

const SCAN_LABELS = ['صفحه ۱ — اصل امضاشده', 'صفحه ۲ — پیوست مدارک', 'پیوست شناسنامه'];

function buildDocuments(): { documents: DocRecord[]; scans: ScanFile[] } {
  const documents: DocRecord[] = [];
  const scans: ScanFile[] = [];
  DOC_SEEDS.forEach((seed, index) => {
    const template = templateById(seed.templateId);
    const client = seed.clientId ? CLIENTS.find((item) => item.id === seed.clientId) : undefined;
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
  { ago: 1, userId: 'u-admin', userName: 'علی محمدی', action: 'ایجاد پرونده', entity: 'client', entityId: 'cl-8', entityLabel: 'نگار سلطانی' },
  { ago: 2, userId: 'u-contracts', userName: 'مرضیه صادقی', action: 'بارگذاری اسکن امضاشده', entity: 'scan', entityId: 'scan-8-1', entityLabel: 'صورتجلسه تحویل و تخلیه ملک' },
  { ago: 3, userId: 'u-admin', userName: 'علی محمدی', action: 'چاپ سند', entity: 'document', entityId: 'doc-4', entityLabel: 'اجاره‌نامه ملک مسکونی' },
  { ago: 5, userId: 'u-super', userName: 'سارا رضایی', action: 'ویرایش دسترسی کاربر', entity: 'user', entityId: 'u-viewer', entityLabel: 'رضا کریمی', detail: 'افزودن دسترسی مشاهده گزارش‌ها' },
  { ago: 6, userId: 'u-contracts', userName: 'مرضیه صادقی', action: 'ایجاد سند', entity: 'document', entityId: 'doc-7', entityLabel: 'قرارداد پیش‌فروش واحد ساختمانی' },
  { ago: 8, userId: 'u-super', userName: 'سارا رضایی', action: 'افزودن قالب فرم', entity: 'template', entityId: 'tpl-handover', entityLabel: 'صورتجلسه تحویل و تخلیه ملک' },
  { ago: 9, userId: 'u-admin', userName: 'علی محمدی', action: 'ویرایش پرونده', entity: 'client', entityId: 'cl-1', entityLabel: 'مهدی رستگار' },
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
    clients: CLIENTS,
    documents,
    templates: SEED_TEMPLATES,
    roles: [...PRESET_ROLES, ...CUSTOM_ROLES],
    scans,
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
