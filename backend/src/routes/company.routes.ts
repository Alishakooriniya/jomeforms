import { Router } from 'express';
import type { Container } from '../container.js';
import { CompanyController } from '../controllers/company.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate, requirePermission, validate } from '../middleware/index.js';
import { idParamsSchema } from '../validators/common.validator.js';
import {
  companyListQuerySchema,
  companyMembersBodySchema,
  createCompanySchema,
  updateCompanySchema,
} from '../validators/company.validator.js';

export function createCompanyRouter(container: Container): Router {
  const router = Router();
  const controller = new CompanyController(container.services.companies);

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('companies.view'),
    validate({ query: companyListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/:id',
    requirePermission('companies.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.get),
  );
  router.post(
    '/',
    requirePermission('companies.create'),
    validate({ body: createCompanySchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    '/:id',
    requirePermission('companies.edit'),
    validate({ params: idParamsSchema, body: updateCompanySchema }),
    asyncHandler(controller.update),
  );
  router.put(
    '/:id/members',
    requirePermission('companies.assign'),
    validate({ params: idParamsSchema, body: companyMembersBodySchema }),
    asyncHandler(controller.setMembers),
  );
  router.delete(
    '/:id',
    requirePermission('companies.delete'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
