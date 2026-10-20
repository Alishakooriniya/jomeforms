import { ConflictError, NotFoundError, ValidationError } from '../errors/index.js';
import type { CompanyRepository } from '../repositories/company.repository.js';
import type { UserFilters, UserRepository } from '../repositories/user.repository.js';
import type { RoleId, User } from '../types/domain.js';
import { hashPassword } from '../utils/password.js';
import type { AuditContext } from './audit.service.js';
import type { AuditService } from './audit.service.js';
import { toPublicUser } from './auth.service.js';
import type { AuthService } from './auth.service.js';

export interface CreateUserInput {
  username: string;
  fullName: string;
  password: string;
  role: RoleId;
  permissions: string[];
  title?: string;
  mobile?: string;
  companyId?: string | null;
  active?: boolean;
  note?: string;
}

export interface UpdateUserInput {
  username?: string;
  fullName?: string;
  password?: string;
  role?: RoleId;
  permissions?: string[];
  title?: string | null;
  mobile?: string | null;
  companyId?: string | null;
  active?: boolean;
  note?: string | null;
}

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async list(filters: UserFilters): Promise<{ items: User[]; total: number }> {
    const result = await this.users.list(filters);
    return { items: result.items.map(toPublicUser), total: result.total };
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');
    return toPublicUser(user);
  }

  async create(input: CreateUserInput, context: AuditContext): Promise<User> {
    const existing = await this.users.findByUsername(input.username);
    if (existing) throw new ConflictError('This username is already taken.');

    if (input.companyId) await this.assertCompany(input.companyId);

    const isSuperadmin = input.role === 'superadmin';
    const created = await this.users.create({
      username: input.username,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      permissions: isSuperadmin ? [] : input.permissions,
      title: input.title,
      mobile: input.mobile,
      companyId: input.companyId ?? null,
      active: input.active ?? true,
      note: input.note,
      createdBy: context.actor.id,
    });

    await this.audit.record(context, {
      action: 'ایجاد کاربر',
      entity: 'user',
      entityId: created.id,
      entityLabel: created.fullName,
      detail: isSuperadmin ? 'مدیر ارشد' : `${created.permissions.length} دسترسی`,
    });

    return toPublicUser(created);
  }

  async update(id: string, input: UpdateUserInput, context: AuditContext): Promise<User> {
    const existing = await this.users.findById(id);
    if (!existing) throw new NotFoundError('User');

    if (input.username && input.username.toLowerCase() !== existing.username.toLowerCase()) {
      const duplicate = await this.users.findByUsername(input.username);
      if (duplicate && duplicate.id !== id) throw new ConflictError('This username is already taken.');
    }

    if (input.companyId) await this.assertCompany(input.companyId);

    const nextRole = input.role ?? existing.role;
    const nextActive = input.active ?? existing.active;

    if (existing.role === 'superadmin' && (nextRole !== 'superadmin' || !nextActive)) {
      const activeSuperadmins = await this.users.countActiveSuperadmins();
      if (activeSuperadmins <= 1) {
        throw new ConflictError('The last superadmin cannot be demoted or deactivated.');
      }
    }

    const permissions =
      nextRole === 'superadmin' ? [] : (input.permissions ?? existing.permissions.filter((key) => key !== '*'));

    const updated = await this.users.update(id, {
      username: input.username,
      fullName: input.fullName,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
      role: input.role,
      permissions,
      title: input.title,
      mobile: input.mobile,
      companyId: input.companyId,
      active: input.active,
      note: input.note,
    });

    if (!updated) throw new NotFoundError('User');

    // Deactivating a user or resetting their password must end active sessions.
    if ((!updated.active && existing.active) || input.password) {
      await this.auth.revokeAllSessions(id);
    }

    await this.audit.record(context, {
      action: 'ویرایش کاربر',
      entity: 'user',
      entityId: id,
      entityLabel: updated.fullName,
      detail: input.password ? 'رمز عبور بازنشانی شد' : `${toPublicUser(updated).permissions.length} دسترسی`,
    });

    return toPublicUser(updated);
  }

  async setPermissions(id: string, permissions: string[], context: AuditContext): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');
    if (user.role === 'superadmin') {
      throw new ValidationError([
        { field: 'permissions', message: 'Superadmin permissions are implicit and cannot be edited.' },
      ]);
    }

    const updated = await this.users.replacePermissions(id, permissions, context.actor.id);
    if (!updated) throw new NotFoundError('User');

    await this.audit.record(context, {
      action: 'ویرایش دسترسی‌های کاربر',
      entity: 'user',
      entityId: id,
      entityLabel: updated.fullName,
      detail: `${permissions.length} دسترسی`,
    });

    return toPublicUser(updated);
  }

  async setActive(id: string, active: boolean, context: AuditContext): Promise<User> {
    return this.update(id, { active }, context);
  }

  async delete(id: string, context: AuditContext): Promise<void> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User');

    if (id === context.actor.id) {
      throw new ConflictError('You cannot delete your own account.');
    }
    if (user.role === 'superadmin') {
      throw new ConflictError('Superadmin accounts cannot be deleted; deactivate them instead.');
    }

    await this.auth.revokeAllSessions(id);
    await this.users.delete(id);

    await this.audit.record(context, {
      action: 'حذف کاربر',
      entity: 'user',
      entityId: id,
      entityLabel: user.fullName,
    });
  }

  private async assertCompany(companyId: string): Promise<void> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new ValidationError([{ field: 'companyId', message: 'Company not found.' }]);
    }
  }
}
