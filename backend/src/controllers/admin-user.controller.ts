import type { Request, Response } from 'express';
import type { CreateUserInput, UpdateUserInput, UserService } from '../services/user.service.js';
import type { UserFilters } from '../repositories/user.repository.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

export class AdminUserController {
  constructor(private readonly users: UserService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<ListQuery>(req);
    const filters: UserFilters = toListOptions(query);
    const result = await this.users.listAdmins(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = body<Omit<CreateUserInput, 'role'>>(req);
    const created = await this.users.createAdmin(input, auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Manager account created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const input = body<Omit<UpdateUserInput, 'role'>>(req);
    sendSuccess(res, await this.users.updateAdmin(id, input, auditContext(req)));
  };

  setPermissions = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const { permissions } = body<{ permissions: string[] }>(req);
    sendSuccess(res, await this.users.setAdminPermissions(id, permissions, auditContext(req)));
  };

  setActive = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const { active } = body<{ active: boolean }>(req);
    sendSuccess(res, await this.users.setAdminActive(id, active, auditContext(req)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    await this.users.deleteAdmin(id, auditContext(req));
    sendNoContent(res);
  };
}
