import { Router } from 'express';
import type { Container } from '../container.js';
import { DocumentController } from '../controllers/document.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  authenticate,
  requirePermission,
  uploadSingleFile,
  validate,
} from '../middleware/index.js';
import { idParamsSchema } from '../validators/common.validator.js';
import {
  createDocumentSchema,
  documentListQuerySchema,
  documentStatusSchemaBody,
  scanParamsSchema,
  updateDocumentSchema,
} from '../validators/document.validator.js';

export function createDocumentRouter(container: Container): Router {
  const router = Router();
  const controller = new DocumentController(
    container.services.documents,
    container.services.scans,
  );

  router.use(authenticate(container.repositories.users));

  router.get(
    '/',
    requirePermission('documents.view'),
    validate({ query: documentListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.post(
    '/',
    requirePermission('documents.create'),
    validate({ body: createDocumentSchema }),
    asyncHandler(controller.create),
  );
  router.get(
    '/:id',
    requirePermission('documents.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.get),
  );
  router.patch(
    '/:id',
    requirePermission('documents.edit'),
    validate({ params: idParamsSchema, body: updateDocumentSchema }),
    asyncHandler(controller.update),
  );
  router.patch(
    '/:id/status',
    requirePermission('documents.status'),
    validate({ params: idParamsSchema, body: documentStatusSchemaBody }),
    asyncHandler(controller.changeStatus),
  );
  router.post(
    '/:id/print',
    requirePermission('documents.print'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.print),
  );
  router.delete(
    '/:id',
    requirePermission('documents.delete'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.remove),
  );

  router.get(
    '/:id/scans',
    requirePermission('documents.view'),
    validate({ params: idParamsSchema }),
    asyncHandler(controller.listScans),
  );
  router.post(
    '/:id/scans',
    requirePermission('documents.upload'),
    validate({ params: idParamsSchema }),
    ...uploadSingleFile,
    asyncHandler(controller.uploadScan),
  );
  router.get(
    '/:id/scans/:scanId/file',
    requirePermission('documents.view'),
    validate({ params: scanParamsSchema }),
    asyncHandler(controller.downloadScan),
  );
  router.delete(
    '/:id/scans/:scanId',
    requirePermission('documents.upload'),
    validate({ params: scanParamsSchema }),
    asyncHandler(controller.deleteScan),
  );

  return router;
}
