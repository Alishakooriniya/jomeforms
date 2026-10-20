/* HTTP client for the Jomeforms API (`backend/`).
   The app is local-first by default; when `VITE_API_MODE=server` is set, the
   auth layer talks to this API and the same client is ready to back the data
   layer without changing page components (see `src/lib/api.ts`).

   Response envelope: { success, data, message?, meta? }
   Error envelope:    { success: false, error: { code, message, details?, requestId } } */

import type {
  AppSettings,
  AuditEntry,
  Client,
  Company,
  DocRecord,
  DocStatus,
  FormTemplate,
  PermissionRole,
  ScanFile,
  User,
  WorkflowEvidence,
} from '../types';

export const API_MODE = (import.meta.env.VITE_API_MODE ?? 'local') as 'local' | 'server';
export const isServerMode = API_MODE === 'server';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
    requestId?: string;
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Array<{ field?: string; message: string }>,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The API never returns password hashes; the local domain type carries one. */
export type ApiUser = Omit<User, 'passwordHash'>;

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: ApiUser;
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

/* --------------------------- session handling --------------------------- */

/* The access token is kept in memory only. Page reloads recover the session
   through the HttpOnly refresh cookie, which the browser sends automatically. */
let accessToken: string | null = null;
let refreshRequest: Promise<string | null> | null = null;

function setAccessToken(token: string | null): void {
  accessToken = token;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === null) return;
    params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

async function parse<T>(response: Response): Promise<Envelope<T>> {
  if (response.status === 204) return { success: true, data: undefined as T };
  const body = (await response.json().catch(() => null)) as Envelope<T> | ErrorEnvelope | null;
  if (!response.ok) {
    const error = (body as ErrorEnvelope | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'درخواست به سرور ناموفق بود.',
      error?.details,
      error?.requestId,
    );
  }
  if (!body) throw new ApiError(response.status, 'INVALID_RESPONSE', 'پاسخ سرور قابل خواندن نبود.');
  return body as Envelope<T>;
}

/** Exchange the refresh cookie for a new access token (single-flight). */
export function refreshSession(): Promise<string | null> {
  if (!refreshRequest) {
    refreshRequest = fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as Envelope<AuthSession>;
        setAccessToken(body.data.token);
        return body.data.token;
      })
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: QueryParams;
  retry?: boolean;
}

/** Send a request, transparently refreshing the session once on a 401. */
async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, query, retry = true } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry && path !== '/auth/login' && path !== '/auth/refresh') {
    const token = await refreshSession();
    if (token) return send(path, { ...options, retry: false });
  }

  return response;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await parse<T>(await send(path, options))).data;
}

/** List endpoints also carry pagination metadata, so keep the envelope. */
async function list<T>(path: string, query?: QueryParams): Promise<Page<T>> {
  const result = await parse<T[]>(await send(path, { query }));
  return {
    items: result.data,
    meta: result.meta ?? { page: 1, limit: result.data.length, total: result.data.length, totalPages: 1 },
  };
}

/* ------------------------------- auth ---------------------------------- */

function toAppUser(user: ApiUser): User {
  // Server mode never verifies passwords in the browser.
  return { ...user, passwordHash: '' };
}

export const authApi = {
  isServerMode,

  async login(username: string, password: string): Promise<{ user: User; expiresAt: string }> {
    const session = await request<AuthSession>('/auth/login', {
      method: 'POST',
      body: { username, password },
      retry: false,
    });
    setAccessToken(session.token);
    return { user: toAppUser(session.user), expiresAt: session.expiresAt };
  },

  async restore(): Promise<User | null> {
    const token = await refreshSession();
    if (!token) return null;
    try {
      const user = await request<ApiUser>('/auth/me');
      return toAppUser(user);
    } catch {
      setAccessToken(null);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request<null>('/auth/logout', { method: 'POST', retry: false });
    } finally {
      setAccessToken(null);
    }
  },

  async me(): Promise<User> {
    return toAppUser(await request<ApiUser>('/auth/me'));
  },
};

/* ------------------------------ resources ------------------------------ */

export interface ClientInput extends Omit<Client, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  code?: string;
}

export type DocumentInput = {
  templateId: string;
  clientId?: string | null;
  values?: Record<string, string>;
  status?: DocStatus;
  tags?: string[];
  notes?: string;
};

export type TemplateInput = Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> & {
  version?: number;
};

export type CompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

export type UserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'passwordHash'> & {
  password?: string;
};

export const api = {
  users: {
    list: (query?: QueryParams) => list<ApiUser>('/users', query),
    get: (id: string) => request<ApiUser>(`/users/${id}`),
    create: (input: UserInput) => request<ApiUser>('/users', { method: 'POST', body: input }),
    update: (id: string, input: Partial<UserInput>) =>
      request<ApiUser>(`/users/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
    setPermissions: (id: string, permissions: string[]) =>
      request<ApiUser>(`/users/${id}/permissions`, { method: 'PUT', body: { permissions } }),
    setActive: (id: string, active: boolean) =>
      request<ApiUser>(`/users/${id}/status`, { method: 'PATCH', body: { active } }),
  },

  roles: {
    list: (query?: QueryParams) => list<PermissionRole>('/roles', query),
    get: (id: string) => request<PermissionRole>(`/roles/${id}`),
    create: (input: Pick<PermissionRole, 'name' | 'permissions'> & { description?: string }) =>
      request<PermissionRole>('/roles', { method: 'POST', body: input }),
    update: (id: string, input: Partial<Pick<PermissionRole, 'name' | 'description' | 'permissions'>>) =>
      request<PermissionRole>(`/roles/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
  },

  permissions: {
    list: () => request<Array<{ key: string; group: string; label: string }>>('/permissions'),
  },

  companies: {
    list: (query?: QueryParams) => list<Company>('/companies', query),
    get: (id: string) => request<Company>(`/companies/${id}`),
    create: (input: CompanyInput) => request<Company>('/companies', { method: 'POST', body: input }),
    update: (id: string, input: Partial<CompanyInput>) =>
      request<Company>(`/companies/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) =>
      request<void>(`/companies/${id}`, { method: 'DELETE' }),
    setMembers: (id: string, userIds: string[]) =>
      request<{ added: number; removed: number }>(`/companies/${id}/members`, {
        method: 'PUT',
        body: { userIds },
      }),
  },

  clients: {
    list: (query?: QueryParams) => list<Client>('/clients', query),
    get: (id: string) => request<Client>(`/clients/${id}`),
    create: (input: ClientInput) => request<Client>('/clients', { method: 'POST', body: input }),
    update: (id: string, input: Partial<ClientInput>) =>
      request<Client>(`/clients/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
    completeStep: (id: string, stepId: string) =>
      request<Client>(`/clients/${id}/workflow/steps/${stepId}/complete`, { method: 'POST' }),
    overrideStep: (id: string, stepId: string, reason: string) =>
      request<Client>(`/clients/${id}/workflow/steps/${stepId}/override`, {
        method: 'POST',
        body: { reason },
      }),
    uploadEvidence: (id: string, stepId: string, file: File) => {
      const body = new FormData();
      body.set('file', file);
      return request<WorkflowEvidence>(`/clients/${id}/workflow/steps/${stepId}/evidence`, {
        method: 'POST',
        body,
      });
    },
    evidenceUrl: (evidenceId: string) => `${API_BASE_URL}/clients/evidence/${evidenceId}/file`,
  },

  templates: {
    list: (query?: QueryParams) => list<FormTemplate>('/form-templates', query),
    get: (id: string) => request<FormTemplate>(`/form-templates/${id}`),
    create: (input: TemplateInput) => request<FormTemplate>('/form-templates', { method: 'POST', body: input }),
    update: (id: string, input: Partial<TemplateInput>) =>
      request<FormTemplate>(`/form-templates/${id}`, { method: 'PATCH', body: input }),
    duplicate: (id: string) =>
      request<FormTemplate>(`/form-templates/${id}/duplicate`, { method: 'POST' }),
    remove: (id: string) => request<void>(`/form-templates/${id}`, { method: 'DELETE' }),
  },

  documents: {
    list: (query?: QueryParams) => list<DocRecord>('/documents', query),
    get: (id: string) => request<DocRecord>(`/documents/${id}`),
    create: (input: DocumentInput) => request<DocRecord>('/documents', { method: 'POST', body: input }),
    update: (id: string, input: Partial<Pick<DocRecord, 'title' | 'values' | 'tags' | 'notes'>>) =>
      request<DocRecord>(`/documents/${id}`, { method: 'PATCH', body: input }),
    changeStatus: (id: string, status: DocStatus) =>
      request<DocRecord>(`/documents/${id}/status`, { method: 'PATCH', body: { status } }),
    markPrinted: (id: string) =>
      request<DocRecord>(`/documents/${id}/print`, { method: 'POST' }),
    remove: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
    scans: (id: string) => request<ScanFile[]>(`/documents/${id}/scans`),
    uploadScan: (id: string, file: File) => {
      const body = new FormData();
      body.set('file', file);
      return request<ScanFile>(`/documents/${id}/scans`, { method: 'POST', body });
    },
    deleteScan: (id: string, scanId: string) =>
      request<void>(`/documents/${id}/scans/${scanId}`, { method: 'DELETE' }),
    scanUrl: (id: string, scanId: string) =>
      `${API_BASE_URL}/documents/${id}/scans/${scanId}/file`,
    scanBlob: async (id: string, scanId: string): Promise<Blob> => {
      const response = await fetch(`${API_BASE_URL}/documents/${id}/scans/${scanId}/file`, {
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) {
        throw new ApiError(response.status, 'SCAN_UNAVAILABLE', 'دریافت تصویر اسکن ناموفق بود.');
      }
      return response.blob();
    },
  },

  audit: {
    list: (query?: QueryParams) => list<AuditEntry>('/audit-logs', query),
    clear: () => request<void>('/audit-logs', { method: 'DELETE' }),
  },

  settings: {
    get: () => request<AppSettings>('/settings'),
    update: (patch: Partial<AppSettings>) =>
      request<AppSettings>('/settings', { method: 'PATCH', body: patch }),
  },

  reports: {
    dashboard: () => request<Record<string, unknown>>('/reports/dashboard'),
    overview: () => request<Record<string, unknown>>('/reports/overview'),
    agents: (query?: QueryParams) => list<Record<string, unknown>>('/reports/agents', query),
  },
};
