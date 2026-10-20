import type { Request, Response } from 'express';
import { PERMISSION_CATALOG } from '../config/permissions.js';
import type { RoleFilters } from '../repositories/role.repository.js';
import type { RoleInput, RoleService } from '../services/role.service.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

interface RoleListQuery extends ListQuery {
  system?: boolean;
}

export class RoleController {
  constructor(private readonly roles: RoleService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<RoleListQuery>(req);
    const filters: RoleFilters = { ...toListOptions(query), system: query.system };
    const result = await this.roles.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.roles.getById(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const created = await this.roles.create(body<RoleInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Role created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const updated = await this.roles.update(id, body<Partial<RoleInput>>(req), auditContext(req));
    sendSuccess(res, updated, { message: 'Role updated.' });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    await this.roles.delete(id, auditContext(req));
    sendNoContent(res);
  };

  catalog = (_req: Request, res: Response): void => {
    sendSuccess(res, PERMISSION_CATALOG);
  };
}
