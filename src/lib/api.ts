/* پل ارتباط با بک‌اند.
   پیاده‌سازی واقعی در `src/lib/apiClient.ts` است (قرارداد پاسخ، توکن دسترسی و
   مسیرها با `backend/docs/openapi.yaml` هم‌خوان هستند). این فایل فقط نام‌های
   قبلی را برای کدهای موجود نگه می‌دارد تا مهاجرت تدریجی باشد.

   داده‌ها به‌صورت پیش‌فرض محلی (local-first) می‌مانند؛ برای فعال‌کردن حالت
   سروری، `VITE_API_MODE=server` را در `.env.local` قرار دهید. */

export {
  API_BASE_URL,
  API_MODE,
  ApiError,
  api,
  authApi,
  isServerMode,
  refreshSession,
} from './apiClient';

export type { ApiUser, AuthSession, ClientInput, Page, QueryParams } from './apiClient';

import type { Client, Company, DocRecord, FormTemplate, PermissionRole, User } from '../types';

/** شکل لیست در API؛ `api.<resource>.list()` آن را برمی‌گرداند. */
export interface ApiListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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
