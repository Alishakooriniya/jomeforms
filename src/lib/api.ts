/* پل اتصال به بک‌اند.
   امروز داده‌ها در مرورگر (localStorage + IndexedDB) نگه‌داری می‌شوند و
   سرویس‌های واقعی از همین توابع استفاده خواهند کرد. کافی است بدنه این
   توابع با fetch/axios پر شود و لایه ذخیره‌سازی محلی حذف گردد.
   ساختار داده‌ها با docs/database-schema.sql یکسان است. */

import type { Client, Company, DocRecord, FormTemplate, PermissionRole, User } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** قرارداد پاسخ سرور */
export interface ApiListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

/** فهرست مسیرهای پیشنهادی سرور (برای زمانی که بک‌اند آماده شود) */
export const ENDPOINTS = {
  login: 'POST /auth/login',
  logout: 'POST /auth/logout',
  me: 'GET /auth/me',

  users: 'GET /users',
  createUser: 'POST /users',
  updateUser: 'PATCH /users/:id',
  deleteUser: 'DELETE /users/:id',
  userPermissions: 'PUT /users/:id/permissions',

  roles: 'GET /roles',
  createRole: 'POST /roles',
  updateRole: 'PATCH /roles/:id',
  deleteRole: 'DELETE /roles/:id',

  companies: 'GET /companies',
  createCompany: 'POST /companies',
  updateCompany: 'PATCH /companies/:id',
  deleteCompany: 'DELETE /companies/:id',
  companyMembers: 'PUT /companies/:id/members',

  clients: 'GET /clients',
  createClient: 'POST /clients',
  updateClient: 'PATCH /clients/:id',
  deleteClient: 'DELETE /clients/:id',

  templates: 'GET /form-templates',
  createTemplate: 'POST /form-templates',
  updateTemplate: 'PATCH /form-templates/:id',
  deleteTemplate: 'DELETE /form-templates/:id',

  documents: 'GET /documents',
  createDocument: 'POST /documents',
  updateDocument: 'PATCH /documents/:id',
  documentStatus: 'PATCH /documents/:id/status',
  deleteDocument: 'DELETE /documents/:id',

  uploadScan: 'POST /documents/:id/scans (multipart/form-data)',
  deleteScan: 'DELETE /scans/:id',

  audit: 'GET /audit-logs',
  settings: 'GET /settings | PATCH /settings',
} as const;

/** نمونه فراخوانی آماده برای زمانی که سرویس‌های بالای سرور مستقر شوند */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message: (await response.text()) || 'خطای ارتباط با سرور',
    };
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------
   نگاشت نوع‌های دامنه به مسیرهای سرور (برای مرجع هنگام پیاده‌سازی):

   User            → /users (+ /users/:id/permissions ، فیلد company_id)
   Company         → /companies (+ /companies/:id/members برای اتصال کاربران)
   PermissionRole  → /roles
   Client          → /clients
   FormTemplate    → /form-templates  (fields و body به‌صورت JSON ذخیره می‌شوند)
   DocRecord       → /documents (+ /documents/:id/scans برای فایل اسکن‌شده)
   AuditEntry      → /audit-logs (فقط خواندنی)
   AppSettings     → /settings
------------------------------------------------------------------- */

export type ApiContracts = {
  listClients: () => Promise<ApiListResponse<Client>>;
  saveClient: (payload: Client) => Promise<Client>;
  listTemplates: () => Promise<ApiListResponse<FormTemplate>>;
  listDocuments: () => Promise<ApiListResponse<DocRecord>>;
  listRoles: () => Promise<ApiListResponse<PermissionRole>>;
  listCompanies: () => Promise<ApiListResponse<Company>>;
  saveCompany: (payload: Company) => Promise<Company>;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
};
