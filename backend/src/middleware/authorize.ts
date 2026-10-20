import type { RequestHandler } from 'express';
import { AuthenticationError, AuthorizationError } from '../errors/index.js';

export function hasPermission(
  user: { role: string; permissions: string[] } | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

/** Route-level permission guard; keys mirror the frontend permission catalog. */
export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }
    if (!hasPermission(req.user, permission)) {
      next(new AuthorizationError(`Missing permission: ${permission}.`));
      return;
    }
    next();
  };
}
