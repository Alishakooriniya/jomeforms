import { Router } from 'express';
import type { Container } from '../container.js';
import { ReminderController } from '../controllers/reminder.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { idParamsSchema } from '../validators/common.validator.js';
import { createReminderSchema, reminderListQuerySchema } from '../validators/reminder.validator.js';

export function createReminderRouter(container: Container): Router {
  const router = Router();
  const controller = new ReminderController(container.services.reminders);

  router.use(authenticate(container.repositories.users));

  router.get('/', validate({ query: reminderListQuerySchema }), asyncHandler(controller.list));
  router.post(
    '/',
    requirePermission('reminders.manage'),
    validate({ body: createReminderSchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    '/:id/done',
    validate({ params: idParamsSchema }),
    asyncHandler(controller.markDone),
  );
  router.delete(
    '/:id',
    requirePermission('reminders.manage'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
