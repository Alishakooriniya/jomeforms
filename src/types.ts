/* مدل داده‌های سامانه — مرجع اصلی ساختار داده.
   با فایل docs/database-schema.sql (ساختار پایگاه‌داده) هم‌خوان است. */

export type RoleId = 'superadmin' | 'admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  /** هش ساده — فقط برای دموی سمت کلاینت. در بک‌اند واقعی bcrypt/argon2 جایگزین شود. */
  passwordHash: string;
  role: RoleId;
  /** کلید دسترسی‌ها مثل `clients.create` — سوپرادمین مقدار `['*']` دارد */
  permissions: string[];
  title?: string;
  mobile?: string;
  /** مجموعه‌ای که این کاربر از آن آمده است — اختیاری، کاربر می‌تواند بدون مجموعه باشد */
  companyId?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  note?: string;
}

/* ------------------------------- مجموعه ------------------------------- */

/** نوع مجموعه — مالک زمین، سازنده، تعاونی و ... */
export type CompanyKind = 'owner' | 'developer' | 'cooperative' | 'investor' | 'org' | 'other';

/** مجموعه: شرکت/مالکی که قطعه‌زمین‌های بزرگ در اختیار دارد و کاربرانش با ما کار می‌کنند */
export interface Company {
  id: string;
  name: string;
  kind: CompanyKind;
  /** شناسه ملی یا شماره ثبت */
  nationalId?: string;
  /** رابط یا مدیر مجموعه */
  managerName?: string;
  mobile?: string;
  phone?: string;
  address?: string;
  /** تعداد قطعه‌زمین زیرمجموعه */
  plotCount?: number;
  /** متراژ کل زمین (متر مربع) */
  totalArea?: number;
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AuthSession {
  userId: string;
  loggedInAt: string;
}

/* ------------------------------- پرونده ------------------------------- */

export type ClientStatus = 'new' | 'in_progress' | 'awaiting_docs' | 'done' | 'archived';
export type ClientCaseType = 'document_request' | 'rent_renewal';
export type ClientWorkflowStepKind = 'form' | 'payment' | 'external' | 'completion';
export type ClientWorkflowStepStatus = 'pending' | 'completed';

export interface ClientWorkflowStep {
  id: string;
  title: string;
  kind: ClientWorkflowStepKind;
  status: ClientWorkflowStepStatus;
  requiresEvidence: boolean;
  evidenceIds: string[];
  completedAt?: string;
  completedBy?: string;
  overrideReason?: string;
}

export interface WorkflowEvidence {
  id: string;
  clientId: string;
  stepId: string;
  name: string;
  mime: string;
  size: number;
  blobKey: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Client {
  id: string;
  /** شماره پرونده مثل ۱۴۰۵-۰۰۱۲ */
  code: string;
  fullName: string;
  nationalId: string;
  mobile: string;
  caseType?: ClientCaseType;
  companyId?: string;
  workflow?: ClientWorkflowStep[];
  birthCertificateNumber?: string;
  fatherName?: string;
  issuePlace?: string;
  birthDate?: string;
  status: ClientStatus;
  residenceAddress?: string;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/* ---------------------------- قالب فرم‌ها ----------------------------- */

export type TemplateCategory = 'sale' | 'rent' | 'mortgage' | 'presale' | 'commission' | 'visit' | 'other';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'nationalId'
  | 'mobile';

export interface TemplateField {
  id: string;
  /** نامک انگلیسی؛ در متن قالب به شکل {{key}} استفاده می‌شود */
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  /** پیش‌پرکردن خودکار از پرونده */
  source?: string;
  placeholder?: string;
  help?: string;
  group?: string;
  suffix?: string;
  defaultValue?: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  printLayout?: 'document-request-a4';
  description?: string;
  fields: TemplateField[];
  /** متن قالب با نشانه‌های {{key}} */
  body: string;
  headerNote?: string;
  footerNote?: string;
  requiresSignature: boolean;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/* ------------------------------- اسناد -------------------------------- */

export type DocStatus = 'draft' | 'awaiting_signature' | 'signed' | 'scanned' | 'archived';

export interface DocRecord {
  id: string;
  /** شماره سند مثل ۱۴۰۵-۰۰۰۳۱ */
  number: string;
  title: string;
  templateId: string;
  templateTitle: string;
  templateVersion: number;
  clientId?: string;
  clientName?: string;
  clientCode?: string;
  values: Record<string, string>;
  status: DocStatus;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  printedAt?: string;
  signedAt?: string;
  scanIds: string[];
}

export interface ScanFile {
  id: string;
  documentId: string;
  name: string;
  mime: string;
  size: number;
  /** کلید فایل در IndexedDB (نه در localStorage) */
  blobKey: string;
  pages?: number;
  note?: string;
  uploadedAt: string;
  uploadedBy: string;
}

/* ------------------------------ نقش‌ها -------------------------------- */

export interface PermissionRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  system?: boolean;
  createdAt: string;
  createdBy: string;
}

/* ---------------------------- گزارش فعالیت ---------------------------- */

export type AuditEntity =
  | 'auth'
  | 'client'
  | 'document'
  | 'template'
  | 'user'
  | 'role'
  | 'company'
  | 'settings'
  | 'scan'
  | 'workflow';

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  entity: AuditEntity;
  entityId?: string;
  entityLabel?: string;
  detail?: string;
}

/* ------------------------------ تنظیمات ------------------------------- */

export interface AppSettings {
  orgName: string;
  orgLegalName: string;
  orgPhone: string;
  orgAddress: string;
  defaultProvince: string;
  defaultCity: string;
  docPrefix: string;
  clientPrefix: string;
  showPersianDigits: boolean;
  defaultPageSize: number;
  contractNote: string;
}

/** کل پایگاه‌داده سمت کلاینت (تا زمان اتصال به بک‌اند) */
export interface DbShape {
  users: User[];
  companies: Company[];
  clients: Client[];
  documents: DocRecord[];
  templates: FormTemplate[];
  roles: PermissionRole[];
  scans: ScanFile[];
  workflowEvidence: WorkflowEvidence[];
  audit: AuditEntry[];
  settings: AppSettings;
}

export type ThemeMode = 'light' | 'dark' | 'system';
/** رنگ سازمانی — فقط خانواده سبز (پالت سامانه «سبز روی خاکستری» است) */
export type ThemeAccent = 'green' | 'emerald' | 'mint' | 'forest';
export type ThemeRadius = 'sm' | 'md' | 'lg';

export interface ThemePrefs {
  mode: ThemeMode;
  accent: ThemeAccent;
  radius: ThemeRadius;
}
