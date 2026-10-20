import { Router } from 'express';
import type { Container } from '../container.js';
import { RoleController } from '../controllers/role.controller.js';
import { authenticate, requirePermission } from '../middleware/index.js';

export function createPermissionRouter(container: Container): Router {
  const router = Router();
  const controller = new RoleController(container.services.roles);

  router.use(authenticate(container.repositories.users));
  router.get('/', requirePermission('roles.view'), controller.catalog);

  return router;
}
