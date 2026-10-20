import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors/index.js';
import type { ErrorDetail } from '../errors/index.js';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function formatIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.map((part) => String(part)).join('.') || undefined,
    message: issue.message,
  }));
}

/**
 * Parses body/query/params with zod and exposes the results on req.validated.
 * `req.query` itself is read-only in Express 5, so parsed values are stored
 * separately instead of being reassigned.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    const validated: { body: unknown; query: unknown; params: unknown } = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) validated.body = result.data;
      else details.push(...formatIssues(result.error));
    }
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) validated.query = result.data;
      else details.push(...formatIssues(result.error));
    }
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) validated.params = result.data;
      else details.push(...formatIssues(result.error));
    }

    if (details.length) {
      next(new ValidationError(details));
      return;
    }

    req.validated = validated;
    next();
  };
}
