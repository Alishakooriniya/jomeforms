import type { Request, Response } from 'express';
import type { LetterheadPrintFilters } from '../repositories/letterhead.repository.js';
import type { LetterheadPrintInput, LetterheadService } from '../services/letterhead.service.js';
import type { LetterheadConfig } from '../types/domain.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery } from './context.js';

interface PrintListQuery extends ListQuery {
  userId?: string;
  paper?: 'A4' | 'A5';
  kind?: 'blank' | 'filled';
}

export class LetterheadController {
  constructor(private readonly letterhead: LetterheadService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.letterhead.get());
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const updated = await this.letterhead.update(body<Partial<LetterheadConfig>>(req), auditContext(req));
    sendSuccess(res, updated, { message: 'Letterhead updated.' });
  };

  listPrints = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<PrintListQuery>(req);
    // Route is gated by letterhead.manage — managers always see the full log.
    const filters: LetterheadPrintFilters = {
      ...toListOptions(query),
      userId: query.userId,
      paper: query.paper,
      kind: query.kind,
    };
    const result = await this.letterhead.listPrints(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  recordPrint = async (req: Request, res: Response): Promise<void> => {
    const created = await this.letterhead.recordPrint(body<LetterheadPrintInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Letterhead print recorded.' });
  };
}
