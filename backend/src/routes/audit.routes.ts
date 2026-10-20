import { Router } from 'express';
import type { Container } from '../container.js';
import { AuditController } from '../controllers/audit.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { auditListQuerySchema } from '../validators/audit.validator.js';

export function createAuditRouter(container: Container): Router {
  const router = Router();
  const controller = new AuditController(container.services.audit);

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('audit.view'),
    validate({ query: auditListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.delete('/', requirePermission('settings.edit'), asyncHandler(controller.clear));

  return router;
}
