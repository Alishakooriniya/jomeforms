/* Domain model. Field names match `src/types.ts` in the frontend so API
   responses can be consumed without a mapping layer. */

export type RoleId = 'superadmin' | 'admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: RoleId;
  permissions: string[];
  title?: string;
  mobile?: string;
  companyId?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  note?: string;
}

export interface UserRecord extends User {
  passwordHash: string;
}

export type CompanyKind = 'owner' | 'developer' | 'cooperative' | 'investor' | 'org' | 'other';

export interface Company {
  id: string;
  name: string;
  kind: CompanyKind;
  nationalId?: string;
  managerName?: string;
  mobile?: string;
  phone?: string;
  address?: string;
  plotCount?: number;
  totalArea?: number;
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ClientStatus = 'new' | 'in_progress' | 'awaiting_docs' | 'done' | 'archived';
export type ClientCaseType = 'document_request' | 'rent_renewal';
export type WorkflowStepKind = 'form' | 'payment' | 'external' | 'completion';
export type WorkflowStepStatus = 'pending' | 'completed';

export interface ClientWorkflowStep {
  id: string;
  title: string;
  kind: WorkflowStepKind;
  status: WorkflowStepStatus;
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
  code: string;
  fullName: string;
  nationalId: string;
  mobile: string;
  caseType: ClientCaseType;
  companyId?: string;
  workflow: ClientWorkflowStep[];
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

export interface ClientWithRelations extends Client {
  companyName?: string;
  documentCount: number;
  evidence: WorkflowEvidence[];
}

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
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  source?: string;
  placeholder?: string;
  help?: string;
  group?: string;
  suffix?: string;
  defaultValue?: string;
}

/* چیدمان کانواسی فرم — مقدار فیلدها روی قاب ثابت فرم کاغذی (تصویر) در جای
   دقیق خودش چاپ می‌شود؛ همه مختصات درصدِ صفحه و y مرکز خط است. */
export interface CanvasPlacement {
  /** نامک فیلد قالب یا یک نشانه سیستمی مثل __date */
  field: string;
  /** برای فیلد select: این نشانه تیکِ مربع همان گزینه را روی قاب می‌زند */
  option?: string;
  x: number;
  y: number;
  /** عرض جای متغیر در درصدِ صفحه؛ خالی یعنی به‌اندازه متن */
  width?: number;
  align?: 'right' | 'center' | 'left';
  fontScale?: number;
}

export interface TemplateCanvas {
  /** مسیر عمومی تصویر قاب فرم (دارایی باندل‌شده در frontend) */
  frame?: string;
  /** اندازه پایه فونت مقادیر به cqw */
  fontSize?: number;
  placements: CanvasPlacement[];
}

export interface FormTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  printLayout?: 'document-request-a4' | 'canvas-a4';
  canvas?: TemplateCanvas;
  description?: string;
  fields: TemplateField[];
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

export interface FormTemplateWithUsage extends FormTemplate {
  documentCount: number;
}

export type DocStatus = 'draft' | 'awaiting_signature' | 'signed' | 'scanned' | 'archived';

export interface DocRecord {
  id: string;
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
  blobKey: string;
  pages?: number;
  note?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Reminder {
  id: string;
  title: string;
  note?: string;
  /** user-entered Jalali due date, stored as YYYY/MM/DD */
  date: string;
  /** optional HH:MM — no time means due at the start of the day */
  time?: string;
  userId: string;
  userName: string;
  done: boolean;
  doneAt?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

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
  | 'workflow'
  | 'reminder'
  | 'letterhead';

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

export interface AppSettings {
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

/* ------------------------------- سربرگ -------------------------------- */

/** تنظیمات سربرگ — کادر پایین (نشانی دفاتر) تنها بخش قابل‌ویرایش آن است */
export interface LetterheadConfig {
  address: string;
}

export type LetterheadPaper = 'A4' | 'A5';
export type LetterheadPrintKind = 'blank' | 'filled';

/** رخداد چاپ سربرگ — برای پیگیری امنیتی نسخه‌های بیرون‌داده‌شده نگه داشته می‌شود */
export interface LetterheadPrint {
  id: string;
  paper: LetterheadPaper;
  kind: LetterheadPrintKind;
  /** تصویر لحظه‌ای فیلدهای چاپ‌شده (برای «خالی» خالی است) */
  values: Record<string, string>;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Actor {
  id: string;
  name: string;
}

export interface ListOptions {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
