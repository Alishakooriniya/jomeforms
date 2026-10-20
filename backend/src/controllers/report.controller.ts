import type { Request, Response } from 'express';
import type { ReportService } from '../services/report.service.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { listQuery } from './context.js';

export class ReportController {
  constructor(private readonly reports: ReportService) {}

  dashboard = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.reports.dashboard());
  };

  overview = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.reports.overview());
  };

  agents = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<ListQuery>(req);
    const result = await this.reports.agents(toListOptions(query));
    sendPaginated(res, result, query.page, query.limit);
  };
}
