import { Router } from 'express';
import type { Container } from '../container.js';
import { BackupController } from '../controllers/backup.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requireSuperadmin } from '../middleware/index.js';

export function createBackupRouter(container: Container): Router {
  const router = Router();
  const controller = new BackupController(container.services.backup);

  router.use(authenticate(container.repositories.users), requireSuperadmin);

  router.get('/export', asyncHandler(controller.export));
  router.post('/import', asyncHandler(controller.import));

  return router;
}
