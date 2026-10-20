import { Router } from 'express';
import type { Container } from '../container.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

export function createSettingsRouter(container: Container): Router {
  const router = Router();
  const controller = new SettingsController(container.services.settings);

  router.use(authenticate(container.repositories.users));

  router.get('/', requirePermission('settings.view'), asyncHandler(controller.get));
  router.patch(
    '/',
    requirePermission('settings.edit'),
    validate({ body: updateSettingsSchema }),
    asyncHandler(controller.update),
  );

  return router;
}
