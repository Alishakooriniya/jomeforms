import { Router } from 'express';
import type { Container } from '../container.js';
import { createAuditRouter } from './audit.routes.js';
import { createAdminUserRouter } from './admin-user.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createClientRouter } from './client.routes.js';
import { createCompanyRouter } from './company.routes.js';
import { createDocumentRouter } from './document.routes.js';
import { createPermissionRouter } from './permission.routes.js';
import { createReportRouter } from './report.routes.js';
import { createRoleRouter } from './role.routes.js';
import { createSettingsRouter } from './settings.routes.js';
import { createTemplateRouter } from './template.routes.js';
import { createUserRouter } from './user.routes.js';

export function createApiRouter(container: Container): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(container));
  router.use('/admin-users', createAdminUserRouter(container));
  router.use('/users', createUserRouter(container));
  router.use('/roles', createRoleRouter(container));
  router.use('/permissions', createPermissionRouter(container));
  router.use('/companies', createCompanyRouter(container));
  router.use('/clients', createClientRouter(container));
  router.use('/form-templates', createTemplateRouter(container));
  router.use('/documents', createDocumentRouter(container));
  router.use('/audit-logs', createAuditRouter(container));
  router.use('/settings', createSettingsRouter(container));
  router.use('/reports', createReportRouter(container));

  return router;
}
