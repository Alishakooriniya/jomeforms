import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ErrorCode } from '../errors/index.js';
import type { Response } from 'express';

function limitHandler(_req: unknown, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: ErrorCode.RATE_LIMITED,
      message: 'Too many requests. Please try again later.',
    },
  });
}

export const globalRateLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler,
});

/** Failed logins are throttled per IP; successful logins do not consume budget. */
export const loginRateLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: limitHandler,
});
