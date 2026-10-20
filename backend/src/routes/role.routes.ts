import { Router } from 'express';
import type { Container } from '../container.js';
import { RoleController } from '../controllers/role.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { idParamsSchema } from '../validators/common.validator.js';
import {
  createRoleSchema,
  roleListQuerySchema,
  updateRoleSchema,
} from '../validators/role.validator.js';

export function createRoleRouter(container: Container): Router {
  const router = Router();
  const controller = new RoleController(container.services.roles);

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('roles.view'),
    validate({ query: roleListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/:id',
    requirePermission('roles.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.get),
  );
  router.post(
    '/',
    requirePermission('roles.manage'),
    validate({ body: createRoleSchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    '/:id',
    requirePermission('roles.manage'),
    validate({ params: idParamsSchema, body: updateRoleSchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    requirePermission('roles.manage'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
