import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/index.js';
import type { ClientFilters, ClientInput } from '../repositories/client.repository.js';
import type { ClientCaseType, ClientStatus } from '../types/domain.js';
import type { ClientService, CreateClientInput } from '../services/client.service.js';
import type { WorkflowService } from '../services/workflow.service.js';
import { toUploadedFile } from '../middleware/upload.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

interface ClientListQuery extends ListQuery {
  status?: ClientStatus;
  caseType?: ClientCaseType;
  companyId?: string;
}

function sendInlineFile(
  res: Response,
  file: { buffer: Buffer; mimeType: string; fileName: string },
): void {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.send(file.buffer);
}

export class ClientController {
  constructor(
    private readonly clients: ClientService,
    private readonly workflow: WorkflowService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<ClientListQuery>(req);
    const filters: ClientFilters = {
      ...toListOptions(query),
      status: query.status,
      caseType: query.caseType,
      companyId: query.companyId,
    };
    const result = await this.clients.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.clients.getById(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const created = await this.clients.create(body<CreateClientInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Case file created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const updated = await this.clients.update(id, body<Partial<ClientInput>>(req), auditContext(req));
    sendSuccess(res, updated, { message: 'Case file updated.' });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    await this.clients.delete(id, auditContext(req));
    sendNoContent(res);
  };

  uploadEvidence = async (req: Request, res: Response): Promise<void> => {
    const { id, stepId } = params<{ id: string; stepId: string }>(req);
    if (!req.file) throw new BadRequestError('A file is required in the "file" field.');
    const evidence = await this.workflow.uploadEvidence(
      id,
      stepId,
      toUploadedFile(req.file),
      auditContext(req),
    );
    sendSuccess(res, evidence, { status: 201, message: 'Evidence uploaded.' });
  };

  completeStep = async (req: Request, res: Response): Promise<void> => {
    const { id, stepId } = params<{ id: string; stepId: string }>(req);
    const result = await this.workflow.completeStep(id, stepId, auditContext(req));
    sendSuccess(res, result.client, { message: 'Workflow step completed.' });
  };

  overrideStep = async (req: Request, res: Response): Promise<void> => {
    const { id, stepId } = params<{ id: string; stepId: string }>(req);
    const { reason } = body<{ reason: string }>(req);
    const result = await this.workflow.overrideStep(id, stepId, reason, auditContext(req));
    sendSuccess(res, result.client, { message: 'Workflow step overridden.' });
  };

  getEvidenceFile = async (req: Request, res: Response): Promise<void> => {
    const { evidenceId } = params<{ evidenceId: string }>(req);
    sendInlineFile(res, await this.workflow.getEvidenceFile(evidenceId));
  };
}
