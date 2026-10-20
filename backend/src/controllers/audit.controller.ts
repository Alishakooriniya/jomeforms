import type { Request, Response } from 'express';
import type { AuditFilters } from '../repositories/audit.repository.js';
import type { AuditEntity } from '../types/domain.js';
import type { AuditService } from '../services/audit.service.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, listQuery } from './context.js';

interface AuditListQuery extends ListQuery {
  entity?: AuditEntity;
  userId?: string;
  from?: string;
  to?: string;
}

export class AuditController {
  constructor(private readonly audit: AuditService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<AuditListQuery>(req);
    const filters: AuditFilters = {
      ...toListOptions(query),
      entity: query.entity,
      userId: query.userId,
      from: query.from,
      to: query.to,
    };
    const result = await this.audit.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  clear = async (req: Request, res: Response): Promise<void> => {
    const removed = await this.audit.clear(auditContext(req));
    sendSuccess(res, { removed }, { message: 'Audit log cleared.' });
  };
}
