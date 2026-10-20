import type { Request, Response } from 'express';
import type { UserFilters } from '../repositories/user.repository.js';
import type { RoleId } from '../types/domain.js';
import type { CreateUserInput, UpdateUserInput, UserService } from '../services/user.service.js';
import { toListOptions } from '../utils/pagination.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import type { ListQuery } from '../utils/pagination.js';
import { auditContext, body, listQuery, params } from './context.js';

interface UserListQuery extends ListQuery {
  role?: RoleId;
  active?: boolean;
  companyId?: string;
}

export class UserController {
  constructor(private readonly users: UserService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<UserListQuery>(req);
    const filters: UserFilters = {
      ...toListOptions(query),
      role: query.role,
      active: query.active,
      companyId: query.companyId,
    };
    const result = await this.users.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    sendSuccess(res, await this.users.getById(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = body<CreateUserInput>(req);
    const created = await this.users.create(input, auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'User created.' });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const input = body<UpdateUserInput>(req);
    sendSuccess(res, await this.users.update(id, input, auditContext(req)), { message: 'User updated.' });
  };

  setPermissions = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const { permissions } = body<{ permissions: string[] }>(req);
    sendSuccess(res, await this.users.setPermissions(id, permissions, auditContext(req)), {
      message: 'Permissions updated.',
    });
  };

  setActive = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const { active } = body<{ active: boolean }>(req);
    sendSuccess(res, await this.users.setActive(id, active, auditContext(req)), {
      message: active ? 'User activated.' : 'User deactivated.',
    });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    await this.users.delete(id, auditContext(req));
    sendNoContent(res);
  };
}
