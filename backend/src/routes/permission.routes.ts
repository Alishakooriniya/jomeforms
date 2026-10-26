import { Router } from 'express';
import type { Container } from '../container.js';
import { PERMISSION_CATALOG } from '../config/permissions.js';
import { authenticate } from '../middleware/index.js';
import { sendSuccess } from '../utils/response.js';

export function createPermissionRouter(container: Container): Router {
  const router = Router();

  router.use(authenticate(container.repositories.users));
  router.get('/', (_req, res) => {
    sendSuccess(res, PERMISSION_CATALOG);
  });

  return router;
}
