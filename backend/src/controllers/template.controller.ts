import type { Request, Response } from 'express';
import type { TemplateFilters } from '../repositories/template.repository.js';
import type { TemplateCategory } from '../types/domain.js';
import type { CreateTemplateInput, TemplateService } from '../services/template.service.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

interface TemplateListQuery extends ListQuery {
  category?: TemplateCategory;
  active?: boolean;
}

export class TemplateController {
  constructor(private readonly templates: TemplateService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<TemplateListQuery>(req);
    const filters: TemplateFilters = {
      ...toListOptions(query),
      category: query.category,
      active: query.active,
    };
    const result = await this.templates.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.templates.getById(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const created = await this.templates.create(body<CreateTemplateInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Template created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const updated = await this.templates.update(
      id,
      body<Partial<CreateTemplateInput>>(req),
      auditContext(req),
    );
    sendSuccess(res, updated, { message: 'Template updated.' });
  };

  duplicate = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const copy = await this.templates.duplicate(id, auditContext(req));
    sendSuccess(res, copy, { status: 201, message: 'Template duplicated.' });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const result = await this.templates.delete(id, auditContext(req));
    sendSuccess(res, result, { message: 'Template deleted.' });
  };
}
