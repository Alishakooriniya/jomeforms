import { Router } from 'express';
import type { Container } from '../container.js';
import { UserController } from '../controllers/user.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { idParamsSchema } from '../validators/common.validator.js';
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userPermissionsBodySchema,
  userStatusBodySchema,
} from '../validators/user.validator.js';

export function createUserRouter(container: Container): Router {
  const router = Router();
  const controller = new UserController(container.services.users);

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('users.view'),
    validate({ query: userListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/:id',
    requirePermission('users.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.get),
  );
  router.post(
    '/',
    requirePermission('users.create'),
    validate({ body: createUserSchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    '/:id',
    requirePermission('users.edit'),
    validate({ params: idParamsSchema, body: updateUserSchema }),
    asyncHandler(controller.update),
  );
  router.put(
    '/:id/permissions',
    requirePermission('users.edit'),
    validate({ params: idParamsSchema, body: userPermissionsBodySchema }),
    asyncHandler(controller.setPermissions),
  );
  router.patch(
    '/:id/status',
    requirePermission('users.edit'),
    validate({ params: idParamsSchema, body: userStatusBodySchema }),
    asyncHandler(controller.setActive),
  );
  router.delete(
    '/:id',
    requirePermission('users.delete'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
