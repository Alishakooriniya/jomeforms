import { Router } from 'express';
import type { Container } from '../container.js';
import { ReportController } from '../controllers/report.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { agentReportQuerySchema } from '../validators/report.validator.js';

export function createReportRouter(container: Container): Router {
  const router = Router();
  const controller = new ReportController(container.services.reports);

  router.use(authenticate(container.repositories.users));

  router.get('/dashboard', requirePermission('dashboard.view'), asyncHandler(controller.dashboard));
  router.get('/overview', requirePermission('reports.view'), asyncHandler(controller.overview));
  router.get(
    '/agents',
    requirePermission('reports.view'),
    validate({ query: agentReportQuerySchema }),
    asyncHandler(controller.agents),
  );

  return router;
}
