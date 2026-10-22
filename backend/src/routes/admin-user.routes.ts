import { Router } from 'express';
import type { Container } from '../container.js';
import { AdminUserController } from '../controllers/admin-user.controller.js';
import { authenticate, requireSuperadmin, validate } from '../middleware/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { idParamsSchema } from '../validators/common.validator.js';
import { userListQuerySchema, userPermissionsBodySchema, userStatusBodySchema } from '../validators/user.validator.js';
import { createAdminUserSchema, updateAdminUserSchema } from '../validators/user.validator.js';

export function createAdminUserRouter(container: Container): Router {
  const router = Router();
  const controller = new AdminUserController(container.services.users);

  router.use(authenticate(container.repositories.users), requireSuperadmin);
  router.get('/', validate({ query: userListQuerySchema }), asyncHandler(controller.list));
  router.post('/', validate({ body: createAdminUserSchema }), asyncHandler(controller.create));
  router.patch(
    '/:id',
    validate({ params: idParamsSchema, body: updateAdminUserSchema }),
    asyncHandler(controller.update),
  );
  router.put(
    '/:id/permissions',
    validate({ params: idParamsSchema, body: userPermissionsBodySchema }),
    asyncHandler(controller.setPermissions),
  );
  router.patch(
    '/:id/status',
    validate({ params: idParamsSchema, body: userStatusBodySchema }),
    asyncHandler(controller.setActive),
  );
  router.delete('/:id', validate({ params: idParamsSchema }), asyncHandler(controller.remove));

  return router;
}
