import { AppError } from './app-error.js';
import { ErrorCode } from './error-codes.js';
import type { ErrorDetail } from './app-error.js';

export class BadRequestError extends AppError {
  constructor(message = 'The request is invalid.', details?: ErrorDetail[]) {
    super(400, ErrorCode.BAD_REQUEST, message, { details });
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetail[], message = 'Request validation failed.') {
    super(422, ErrorCode.VALIDATION_ERROR, message, { details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.', code: string = ErrorCode.AUTHENTICATION_REQUIRED) {
    super(401, code, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, ErrorCode.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', message?: string) {
    super(404, ErrorCode.RESOURCE_NOT_FOUND, message ?? `${resource} was not found.`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = ErrorCode.CONFLICT) {
    super(409, code, message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'The uploaded payload is too large.') {
    super(413, ErrorCode.PAYLOAD_TOO_LARGE, message);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Unsupported file type.') {
    super(415, ErrorCode.UNSUPPORTED_MEDIA_TYPE, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected error occurred.', cause?: unknown) {
    super(500, ErrorCode.INTERNAL_ERROR, message, { cause });
  }
}
