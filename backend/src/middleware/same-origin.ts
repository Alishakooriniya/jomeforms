import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AuthorizationError } from '../errors/index.js';

/**
 * Cookie-backed endpoints (refresh/logout) are protected against CSRF by
 * rejecting browser requests whose Origin is not an allowed frontend origin.
 * Non-browser clients that omit Origin are unaffected.
 */
export const requireSameOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (!origin || env.corsOrigins.includes(origin)) {
    next();
    return;
  }
  next(new AuthorizationError('Cross-origin request rejected.'));
};
