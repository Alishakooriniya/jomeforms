import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import type { DatabaseError } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ErrorCode,
  PayloadTooLargeError,
} from '../errors/index.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} was not found.`,
      requestId: req.requestId,
    },
  });
};

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return new PayloadTooLargeError();
    return new BadRequestError(`Invalid upload: ${error.code}.`);
  }

  const pgError = error as DatabaseError;
  if (pgError && typeof pgError.code === 'string') {
    if (pgError.code === '23505') return new ConflictError('A record with these values already exists.');
    if (pgError.code === '23503') return new ConflictError('The operation conflicts with a related record.');
    if (pgError.code === '22P02') return new BadRequestError('A supplied identifier is malformed.');
    if (pgError.code === '23514' || pgError.code === '23502') {
      return new BadRequestError('The supplied data violates a database constraint.');
    }
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return new BadRequestError('Malformed JSON body.');
  }

  return new AppError(500, ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred.', { cause: error });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = normalizeError(error);

  if (appError.statusCode >= 500) {
    logger.error(
      { err: error, requestId: req.requestId, method: req.method, url: req.originalUrl, userId: req.user?.id },
      'unhandled request error',
    );
  } else {
    logger.warn(
      { code: appError.code, requestId: req.requestId, method: req.method, url: req.originalUrl },
      appError.message,
    );
  }

  const message =
    appError.statusCode >= 500 && env.isProduction
      ? 'An unexpected error occurred.'
      : appError.message;

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message,
      ...(appError.details && appError.expose ? { details: appError.details } : {}),
      requestId: req.requestId,
    },
  });
};
