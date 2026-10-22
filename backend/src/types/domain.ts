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
  phone?: string;
  fatherName?: string;
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

export interface FormTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  printLayout?: 'document-request-a4';
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

export interface PermissionRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  system?: boolean;
  createdAt: string;
  createdBy: string;
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
