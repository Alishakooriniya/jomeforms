import bcrypt from 'bcryptjs';
import { logger } from '../config/logger.js';
import { AuthenticationError, ErrorCode } from '../errors/index.js';
import type { AuditRepository } from '../repositories/audit.repository.js';
import type { SessionRepository } from '../repositories/session.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../types/domain.js';
import { verifyPassword } from '../utils/password.js';
import {
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../utils/tokens.js';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: User;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function toPublicUser(user: {
  id: string;
  username: string;
  fullName: string;
  role: User['role'];
  permissions: string[];
  title?: string;
  mobile?: string;
  companyId?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  note?: string;
}): User {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions,
    title: user.title,
    mobile: user.mobile,
    companyId: user.companyId,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    note: user.note,
  };
}

/** A bcrypt hash of a value nobody can supply, used to equalize login timing. */
const DUMMY_HASH = bcrypt.hashSync('jomeforms-dummy-password', 10);

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly audit: AuditRepository,
  ) {}

  async login(username: string, password: string, meta: RequestMeta): Promise<LoginResult> {
    const user = await this.users.findByUsername(username);
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

    // Verify the password even for unknown users to avoid username enumeration.
    if (!user || !passwordMatches) {
      logger.warn({ username, ip: meta.ipAddress }, 'failed login attempt');
      throw new AuthenticationError('Invalid username or password.', ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.active) {
      throw new AuthenticationError('This account is disabled.', ErrorCode.ACCOUNT_DISABLED);
    }

    const refresh = createRefreshToken();
    await this.sessions.create({
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
    await this.users.touchLogin(user.id);

    await this.audit.create({
      userId: user.id,
      userName: user.fullName,
      action: 'ورود به سامانه',
      entity: 'auth',
      entityId: user.id,
      entityLabel: user.fullName,
      ipAddress: meta.ipAddress,
    });

    const access = signAccessToken(user.id);
    return {
      token: access.token,
      expiresAt: access.expiresAt.toISOString(),
      user: toPublicUser(user),
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<LoginResult> {
    const session = await this.sessions.findByHash(hashRefreshToken(refreshToken));
    if (!session) throw new AuthenticationError('Invalid or expired session.', ErrorCode.INVALID_TOKEN);

    const user = await this.users.findById(session.userId);
    if (!user || !user.active) {
      await this.sessions.deleteByHash(hashRefreshToken(refreshToken));
      throw new AuthenticationError('This account is disabled.', ErrorCode.ACCOUNT_DISABLED);
    }

    // Rotate: the old token is invalidated on every use.
    await this.sessions.deleteByHash(hashRefreshToken(refreshToken));
    const next = createRefreshToken();
    await this.sessions.create({
      userId: user.id,
      tokenHash: next.hash,
      expiresAt: next.expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const access = signAccessToken(user.id);
    return {
      token: access.token,
      expiresAt: access.expiresAt.toISOString(),
      user: toPublicUser(user),
      refreshToken: next.token,
      refreshExpiresAt: next.expiresAt,
    };
  }

  /** Revoke the refresh session. Works even when the access token has expired. */
  async logout(refreshToken: string | undefined, meta: RequestMeta): Promise<void> {
    if (!refreshToken) return;
    const hash = hashRefreshToken(refreshToken);
    const session = await this.sessions.findByHash(hash);
    await this.sessions.deleteByHash(hash);
    if (!session) return;

    const user = await this.users.findById(session.userId);
    if (!user) return;
    await this.audit.create({
      userId: user.id,
      userName: user.fullName,
      action: 'خروج از سامانه',
      entity: 'auth',
      entityId: user.id,
      entityLabel: user.fullName,
      ipAddress: meta.ipAddress,
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessions.deleteAllForUser(userId);
  }
}
