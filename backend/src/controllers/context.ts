import type { Request } from 'express';
import { AuthenticationError } from '../errors/index.js';
import type { AuditContext } from '../services/audit.service.js';
import type { ListQuery } from '../utils/pagination.js';

/** Build the audit context from the authenticated request. */
export function auditContext(req: Request): AuditContext {
  if (!req.user) throw new AuthenticationError();
  return {
    actor: { id: req.user.id, name: req.user.fullName },
    ipAddress: req.ip,
  };
}

export function listQuery<T extends ListQuery>(req: Request): T {
  return req.validated.query as T;
}

export function body<T>(req: Request): T {
  return req.validated.body as T;
}

export function params<T>(req: Request): T {
  return req.validated.params as T;
}
