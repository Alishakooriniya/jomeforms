import { ConflictError, NotFoundError } from '../errors/index.js';
import type { RoleFilters, RoleRepository } from '../repositories/role.repository.js';
import type { PermissionRole } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export class RoleService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly audit: AuditService,
  ) {}

  async list(filters: RoleFilters): Promise<{ items: PermissionRole[]; total: number }> {
    return this.roles.list(filters);
  }

  async getById(id: string): Promise<PermissionRole> {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async create(input: RoleInput, context: AuditContext): Promise<PermissionRole> {
    const created = await this.roles.create({
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      createdBy: context.actor.id,
    });

    await this.audit.record(context, {
      action: 'ایجاد نقش',
      entity: 'role',
      entityId: created.id,
      entityLabel: created.name,
      detail: `${created.permissions.length} دسترسی`,
    });

    return created;
  }

  async update(id: string, input: Partial<RoleInput>, context: AuditContext): Promise<PermissionRole> {
    const existing = await this.roles.findById(id);
    if (!existing) throw new NotFoundError('Role');

    const updated = await this.roles.update(id, {
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });
    if (!updated) throw new NotFoundError('Role');

    await this.audit.record(context, {
      action: 'ویرایش نقش',
      entity: 'role',
      entityId: id,
      entityLabel: updated.name,
      detail: `${updated.permissions.length} دسترسی`,
    });

    return updated;
  }

  async delete(id: string, context: AuditContext): Promise<void> {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundError('Role');
    if (role.system) throw new ConflictError('System roles cannot be deleted.');

    await this.roles.delete(id);
    await this.audit.record(context, {
      action: 'حذف نقش',
      entity: 'role',
      entityId: id,
      entityLabel: role.name,
    });
  }
}
