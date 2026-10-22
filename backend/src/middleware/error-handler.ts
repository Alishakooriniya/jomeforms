import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import type { DatabaseError } from 'pg';
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
      message: 'مسیر درخواستی پیدا نشد.',
      requestId: req.requestId,
    },
  });
};

function persianMessage(error: AppError): string {
  switch (error.code) {
    case ErrorCode.VALIDATION_ERROR:
      return 'اطلاعات واردشده معتبر نیست.';
    case ErrorCode.BAD_REQUEST:
      if (/upload/i.test(error.message)) return 'فایل بارگذاری‌شده معتبر نیست.';
      if (/identifier/i.test(error.message)) return 'شناسهٔ ارسالی معتبر نیست.';
      if (/json/i.test(error.message)) return 'ساختار درخواست معتبر نیست.';
      return 'درخواست ارسالی نامعتبر است.';
    case ErrorCode.AUTHENTICATION_REQUIRED:
      return 'برای ادامه وارد حساب کاربری شوید.';
    case ErrorCode.INVALID_CREDENTIALS:
      return 'نام کاربری یا رمز عبور نادرست است.';
    case ErrorCode.INVALID_CURRENT_PASSWORD:
      return 'رمز عبور فعلی نادرست است.';
    case ErrorCode.ACCOUNT_DISABLED:
      return 'این حساب کاربری غیرفعال است.';
    case ErrorCode.INVALID_TOKEN:
    case ErrorCode.TOKEN_EXPIRED:
      return 'نشست شما معتبر نیست؛ دوباره وارد شوید.';
    case ErrorCode.FORBIDDEN:
      return 'اجازهٔ انجام این عملیات را ندارید.';
    case ErrorCode.RESOURCE_NOT_FOUND:
      return 'مورد درخواستی پیدا نشد.';
    case ErrorCode.CONFLICT:
      if (/username.*taken/i.test(error.message)) return 'این نام کاربری قبلاً ثبت شده است.';
      if (/own account/i.test(error.message)) return 'نمی‌توانید حساب خودتان را حذف کنید.';
      if (/last superadmin/i.test(error.message)) return 'تنها مدیر ارشد فعال را نمی‌توان غیرفعال یا تنزل رتبه داد.';
      if (/superadmin accounts cannot be deleted/i.test(error.message)) return 'حساب مدیر ارشد را نمی‌توان حذف کرد.';
      if (/only manager accounts/i.test(error.message)) return 'فقط حساب مدیر را می‌توان از این بخش مدیریت کرد.';
      if (/already exists/i.test(error.message)) return 'رکوردی با این اطلاعات از قبل وجود دارد.';
      return 'این عملیات با وضعیت فعلی اطلاعات سازگار نیست.';
    case ErrorCode.PAYLOAD_TOO_LARGE:
      return 'حجم فایل از حد مجاز بیشتر است.';
    case ErrorCode.UNSUPPORTED_MEDIA_TYPE:
      return 'نوع فایل پشتیبانی نمی‌شود.';
    case ErrorCode.RATE_LIMITED:
      return 'تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.';
    default:
      return error.statusCode >= 500 ? 'خطای داخلی سرور رخ داد.' : 'درخواست با خطا روبه‌رو شد.';
  }
}

function persianDetails(error: AppError): AppError['details'] {
  if (!Array.isArray(error.details)) return error.details;
  const labels: Record<string, string> = {
    username: 'نام کاربری',
    fullName: 'نام و نام خانوادگی',
    password: 'رمز عبور',
    currentPassword: 'رمز عبور فعلی',
    newPassword: 'رمز عبور جدید',
    confirmPassword: 'تکرار رمز عبور',
    permissions: 'دسترسی‌ها',
    companyId: 'مجموعه',
    id: 'شناسه',
  };
  return error.details.map((detail) => {
    let message = 'مقدار واردشده معتبر نیست.';
    if (/at least|too small|minimum/i.test(detail.message)) message = 'این مقدار کوتاه‌تر از حد مجاز است.';
    else if (/at most|too big|maximum/i.test(detail.message)) message = 'این مقدار بلندتر از حد مجاز است.';
    else if (/required|expected/i.test(detail.message)) message = 'وارد کردن این مقدار الزامی است.';
    else if (/match/i.test(detail.message)) message = 'مقادیر واردشده با هم مطابقت ندارند.';
    else if (/valid uuid/i.test(detail.message)) message = 'شناسه معتبر نیست.';
    return {
      field: detail.field ? labels[detail.field] ?? 'اطلاعات' : undefined,
      message,
    };
  });
}

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

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: persianMessage(appError),
      ...(appError.details && appError.expose ? { details: persianDetails(appError) } : {}),
      requestId: req.requestId,
    },
  });
};
