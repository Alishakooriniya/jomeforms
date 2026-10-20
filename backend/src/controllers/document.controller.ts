import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/index.js';
import type { DocumentFilters } from '../repositories/document.repository.js';
import type { DocStatus } from '../types/domain.js';
import type {
  CreateDocumentInput,
  DocumentService,
  UpdateDocumentInput,
} from '../services/document.service.js';
import type { ScanService } from '../services/scan.service.js';
import { toUploadedFile } from '../middleware/upload.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

interface DocumentListQuery extends ListQuery {
  status?: DocStatus;
  templateId?: string;
  clientId?: string;
  createdBy?: string;
  from?: string;
  to?: string;
}

export class DocumentController {
  constructor(
    private readonly documents: DocumentService,
    private readonly scans: ScanService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<DocumentListQuery>(req);
    const filters: DocumentFilters = {
      ...toListOptions(query),
      status: query.status,
      templateId: query.templateId,
      clientId: query.clientId,
      createdBy: query.createdBy,
      from: query.from,
      to: query.to,
    };
    const result = await this.documents.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.documents.getById(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const created = await this.documents.create(body<CreateDocumentInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Document created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const updated = await this.documents.update(id, body<UpdateDocumentInput>(req), auditContext(req));
    sendSuccess(res, updated, { message: 'Document updated.' });
  };

  changeStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const { status } = body<{ status: DocStatus }>(req);
    const updated = await this.documents.changeStatus(id, status, auditContext(req));
    sendSuccess(res, updated, { message: 'Document status updated.' });
  };

  print = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const updated = await this.documents.markPrinted(id, auditContext(req));
    sendSuccess(res, updated, { message: 'Document marked as printed.' });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    await this.documents.delete(id, auditContext(req));
    sendNoContent(res);
  };

  listScans = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.scans.list(id));
  };

  uploadScan = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    if (!req.file) throw new BadRequestError('A file is required in the "file" field.');
    const scan = await this.scans.upload(id, toUploadedFile(req.file), auditContext(req));
    sendSuccess(res, scan, { status: 201, message: 'Scan uploaded.' });
  };

  deleteScan = async (req: Request, res: Response): Promise<void> => {
    const { id, scanId } = params<{ id: string; scanId: string }>(req);
    await this.scans.delete(id, scanId, auditContext(req));
    sendNoContent(res);
  };

  downloadScan = async (req: Request, res: Response): Promise<void> => {
    const { id, scanId } = params<{ id: string; scanId: string }>(req);
    const file = await this.scans.getFile(id, scanId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(file.buffer);
  };
}
