import { Router } from 'express';
import type { Container } from '../container.js';
import { TemplateController } from '../controllers/template.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { idParamsSchema } from '../validators/common.validator.js';
import {
  createTemplateSchema,
  templateListQuerySchema,
  updateTemplateSchema,
} from '../validators/template.validator.js';

export function createTemplateRouter(container: Container): Router {
  const router = Router();
  const controller = new TemplateController(container.services.templates);

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('templates.view'),
    validate({ query: templateListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/:id',
    requirePermission('templates.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.get),
  );
  router.post(
    '/',
    requirePermission('templates.create'),
    validate({ body: createTemplateSchema }),
    asyncHandler(controller.create),
  );
  router.post(
    '/:id/duplicate',
    requirePermission('templates.create'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.duplicate),
  );
  router.patch(
    '/:id',
    requirePermission('templates.edit'),
    validate({ params: idParamsSchema, body: updateTemplateSchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    requirePermission('templates.delete'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
