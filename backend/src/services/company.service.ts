import { NotFoundError, ValidationError } from '../errors/index.js';
import type { CompanyFilters, CompanyInput, CompanyRepository } from '../repositories/company.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { Company } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';

export class CompanyService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditService,
  ) {}

  async list(filters: CompanyFilters): Promise<{ items: Company[]; total: number }> {
    return this.companies.list(filters);
  }

  async getById(id: string): Promise<Company> {
    const company = await this.companies.findById(id);
    if (!company) throw new NotFoundError('Company');
    return company;
  }

  async create(input: CompanyInput, context: AuditContext): Promise<Company> {
    const created = await this.companies.create(
      { ...input, name: input.name.trim() },
      context.actor.id,
    );

    await this.audit.record(context, {
      action: 'افزودن مجموعه',
      entity: 'company',
      entityId: created.id,
      entityLabel: created.name,
    });

    return created;
  }

  async update(id: string, input: Partial<CompanyInput>, context: AuditContext): Promise<Company> {
    const existing = await this.companies.findById(id);
    if (!existing) throw new NotFoundError('Company');

    const updated = await this.companies.update(id, {
      ...input,
      name: input.name?.trim(),
    });
    if (!updated) throw new NotFoundError('Company');

    await this.audit.record(context, {
      action: 'ویرایش مجموعه',
      entity: 'company',
      entityId: id,
      entityLabel: updated.name,
    });

    return updated;
  }

  /** Deleting a company never deletes its users — they are detached instead. */
  async delete(id: string, context: AuditContext): Promise<{ detached: number }> {
    const company = await this.companies.findById(id);
    if (!company) throw new NotFoundError('Company');

    const detached = await this.users.detachCompany(id);
    await this.companies.delete(id);

    await this.audit.record(context, {
      action: 'حذف مجموعه',
      entity: 'company',
      entityId: id,
      entityLabel: company.name,
      detail: detached ? `${detached} کاربر از این مجموعه جدا شد` : undefined,
    });

    return { detached };
  }

  /** Replace the member list of a company; returns how many users joined/left. */
  async setMembers(
    companyId: string,
    userIds: string[],
    context: AuditContext,
  ): Promise<{ added: number; removed: number }> {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundError('Company');

    const uniqueIds = Array.from(new Set(userIds));
    const users = await this.users.findManyByIds(uniqueIds);
    if (users.length !== uniqueIds.length) {
      throw new ValidationError([{ field: 'userIds', message: 'One or more users do not exist.' }]);
    }

    const currentMembers = await this.users.listCompanyMemberIds(companyId);
    const currentSet = new Set(currentMembers);
    const nextSet = new Set(uniqueIds);

    const added = uniqueIds.filter((id) => !currentSet.has(id)).length;
    const removed = currentMembers.filter((id) => !nextSet.has(id)).length;

    if (!added && !removed) return { added: 0, removed: 0 };

    await this.users.syncCompanyMembers(companyId, uniqueIds);

    await this.audit.record(context, {
      action: 'اتصال کاربران به مجموعه',
      entity: 'company',
      entityId: companyId,
      entityLabel: company.name,
      detail: `${added} اتصال • ${removed} جدایی`,
    });

    return { added, removed };
  }
}
