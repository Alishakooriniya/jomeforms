import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthenticationError, ErrorCode } from '../errors/index.js';

export interface AccessTokenPayload {
  sub: string;
  typ: 'access';
}

export function signAccessToken(userId: string): { token: string; expiresAt: Date } {
  const token = jwt.sign({ sub: userId, typ: 'access' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });

  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = new Date((decoded?.exp ?? Math.floor(Date.now() / 1000) + 900) * 1000);
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (typeof payload === 'string' || payload.typ !== 'access' || typeof payload.sub !== 'string') {
      throw new AuthenticationError('Invalid access token.', ErrorCode.INVALID_TOKEN);
    }
    return { sub: payload.sub, typ: 'access' };
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token has expired.', ErrorCode.TOKEN_EXPIRED);
    }
    throw new AuthenticationError('Invalid access token.', ErrorCode.INVALID_TOKEN);
  }
}

/** Opaque refresh token. Only its SHA-256 hash is persisted. */
export function createRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash: hashRefreshToken(token), expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const REFRESH_COOKIE_NAME = 'jf_refresh';

export function refreshCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
