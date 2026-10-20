import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../container.js';
import { ClientController } from '../controllers/client.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  authenticate,
  requirePermission,
  uploadSingleFile,
  validate,
} from '../middleware/index.js';
import { idParamsSchema, uuidSchema } from '../validators/common.validator.js';
import {
  clientListQuerySchema,
  clientStepParamsSchema,
  createClientSchema,
  updateClientSchema,
  workflowOverrideBodySchema,
} from '../validators/client.validator.js';

export function createClientRouter(container: Container): Router {
  const router = Router();
  const controller = new ClientController(
    container.services.clients,
    container.services.workflow,
  );

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('clients.view'),
    validate({ query: clientListQuerySchema }),
    asyncHandler(controller.list),
  );

  router.get(
    '/evidence/:evidenceId/file',
    requirePermission('clients.view'),
    validate({ params: z.object({ evidenceId: uuidSchema }) }),
    asyncHandler(controller.getEvidenceFile),
  );

  router.post(
    '/:id/workflow/steps/:stepId/evidence',
    requirePermission('clients.workflow.advance'),
    validate({ params: clientStepParamsSchema }),
    ...uploadSingleFile,
    asyncHandler(controller.uploadEvidence),
  );
  router.post(
    '/:id/workflow/steps/:stepId/complete',
    requirePermission('clients.workflow.advance'),
    validate({ params: clientStepParamsSchema }),
    asyncHandler(controller.completeStep),
  );
  router.post(
    '/:id/workflow/steps/:stepId/override',
    requirePermission('clients.workflow.override'),
    validate({ params: clientStepParamsSchema, body: workflowOverrideBodySchema }),
    asyncHandler(controller.overrideStep),
  );

  router.get(
    '/:id',
    requirePermission('clients.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.get),
  );
  router.post(
    '/',
    requirePermission('clients.create'),
    validate({ body: createClientSchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    '/:id',
    requirePermission('clients.edit'),
    validate({ params: idParamsSchema, body: updateClientSchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    requirePermission('clients.delete'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
