import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';

export const app: Express = createApp();
export const API = '/api/v1';

export interface LoginResult {
  token: string;
  user: { id: string; permissions: string[]; role: string };
}

export async function login(
  username = process.env.SEED_ADMIN_USERNAME ?? 'testadmin',
  password = process.env.SEED_ADMIN_PASSWORD ?? 'TestAdmin123!',
): Promise<LoginResult> {
  const response = await request(app)
    .post(`${API}/auth/login`)
    .send({ username, password })
    .expect(200);
  return response.body.data as LoginResult;
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** 1x1 transparent PNG used to exercise the upload pipeline. */
export const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export const VALID_NATIONAL_ID = '0123456789';

export function clientPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    fullName: 'علی رضایی',
    nationalId: VALID_NATIONAL_ID,
    mobile: '09123456789',
    caseType: 'document_request',
    residenceAddress: 'خیابان ولیعصر',
    ...overrides,
  };
}
