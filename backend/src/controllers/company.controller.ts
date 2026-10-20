import type { Request, Response } from 'express';
import type { CompanyFilters, CompanyInput } from '../repositories/company.repository.js';
import type { CompanyKind } from '../types/domain.js';
import type { CompanyService } from '../services/company.service.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

interface CompanyListQuery extends ListQuery {
  kind?: CompanyKind;
  active?: boolean;
}

export class CompanyController {
  constructor(private readonly companies: CompanyService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<CompanyListQuery>(req);
    const filters: CompanyFilters = {
      ...toListOptions(query),
      kind: query.kind,
      active: query.active,
    };
    const result = await this.companies.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.companies.getById(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const created = await this.companies.create(body<CompanyInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Company created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const updated = await this.companies.update(id, body<Partial<CompanyInput>>(req), auditContext(req));
    sendSuccess(res, updated, { message: 'Company updated.' });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const result = await this.companies.delete(id, auditContext(req));
    sendSuccess(res, result, { message: 'Company deleted.' });
  };

  setMembers = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const { userIds } = body<{ userIds: string[] }>(req);
    const result = await this.companies.setMembers(id, userIds, auditContext(req));
    sendSuccess(res, result, { message: 'Company members updated.' });
  };
}
