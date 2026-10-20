import type { Request, Response } from 'express';
import { AuthenticationError } from '../errors/index.js';
import type { AuthService } from '../services/auth.service.js';
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../utils/tokens.js';
import { sendSuccess } from '../utils/response.js';
import { body } from './context.js';

interface LoginBody {
  username: string;
  password: string;
}

interface Meta {
  userAgent?: string;
  ipAddress?: string;
}

function requestMeta(req: Request): Meta {
  return { userAgent: req.get('user-agent'), ipAddress: req.ip };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

function readRefreshCookie(req: Request): string | undefined {
  const value = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const input = body<LoginBody>(req);
    const result = await this.auth.login(input.username, input.password, requestMeta(req));
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(
      res,
      { token: result.token, expiresAt: result.expiresAt, user: result.user },
      { message: 'Signed in successfully.' },
    );
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const token = readRefreshCookie(req);
    if (!token) throw new AuthenticationError('No active session.');
    const result = await this.auth.refresh(token, requestMeta(req));
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { token: result.token, expiresAt: result.expiresAt, user: result.user });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.auth.logout(readRefreshCookie(req), requestMeta(req));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    sendSuccess(res, null, { message: 'Signed out successfully.' });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, req.user);
  };
}
