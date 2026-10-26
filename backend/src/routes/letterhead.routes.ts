import { Router } from 'express';
import type { Container } from '../container.js';
import { LetterheadController } from '../controllers/letterhead.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import {
  letterheadPrintListQuerySchema,
  recordLetterheadPrintSchema,
  updateLetterheadSchema,
} from '../validators/letterhead.validator.js';

export function createLetterheadRouter(container: Container): Router {
  const router = Router();
  const controller = new LetterheadController(container.services.letterhead);

  router.use(authenticate(container.repositories.users));

  router.get('/', requirePermission('letterhead.view'), asyncHandler(controller.get));
  router.patch(
    '/',
    requirePermission('letterhead.manage'),
    validate({ body: updateLetterheadSchema }),
    asyncHandler(controller.update),
  );
  // فهرست چاپ‌ها فقط برای مدیر است — گزارش سربرگ‌ها در صفحه «گزارش‌ها» نمایش داده می‌شود
  router.get(
    '/prints',
    requirePermission('letterhead.manage'),
    validate({ query: letterheadPrintListQuerySchema }),
    asyncHandler(controller.listPrints),
  );
  router.post(
    '/prints',
    requirePermission('letterhead.view'),
    validate({ body: recordLetterheadPrintSchema }),
    asyncHandler(controller.recordPrint),
  );

  return router;
}
