import type { ErrorCodeType } from './error-codes.js';

export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Base class for all expected, operational errors.
 * Anything that is not an AppError is treated as an unexpected failure and is
 * reported to the client as a generic 500 without internal details.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeType | string;
  readonly details?: ErrorDetail[] | Record<string, unknown>;
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: ErrorCodeType | string,
    message: string,
    options: { details?: ErrorDetail[] | Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.expose = statusCode < 500;
    Error.captureStackTrace?.(this, new.target);
  }
}
