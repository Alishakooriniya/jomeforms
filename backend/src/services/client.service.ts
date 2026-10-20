import { ConflictError, NotFoundError, ValidationError } from '../errors/index.js';
import { createClientWorkflow } from '../domain/workflow.js';
import type { ClientFilters, ClientInput, ClientRepository } from '../repositories/client.repository.js';
import type { CompanyRepository } from '../repositories/company.repository.js';
import type { SequenceRepository } from '../repositories/sequence.repository.js';
import type { SettingsRepository } from '../repositories/settings.repository.js';
import type { Client, ClientWithRelations } from '../types/domain.js';
import { jalaliYear } from '../utils/jalali.js';
import { formatSequenceNumber } from '../utils/sequence.js';
import type { AuditContext, AuditService } from './audit.service.js';

export type CreateClientInput = Omit<ClientInput, 'code'> & {
  code?: string;
  workflow?: ClientInput['workflow'];
};

export class ClientService {
  constructor(
    private readonly clients: ClientRepository,
    private readonly companies: CompanyRepository,
    private readonly settings: SettingsRepository,
    private readonly sequences: SequenceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(filters: ClientFilters): Promise<{ items: ClientWithRelations[]; total: number }> {
    return this.clients.list(filters);
  }

  async getById(id: string): Promise<ClientWithRelations> {
    const client = await this.clients.findById(id);
    if (!client) throw new NotFoundError('Case file');
    return client;
  }

  async create(input: CreateClientInput, context: AuditContext): Promise<Client> {
    await this.assertCompany(input.companyId ?? undefined);

    const workflow =
      input.workflow && input.workflow.length
        ? input.workflow
        : createClientWorkflow(input.caseType);

    const settings = await this.settings.get();
    const year = jalaliYear();
    let code = input.code?.trim();

    if (code) {
      if (await this.clients.codeExists(code)) {
        throw new ConflictError('A case file with this code already exists.');
      }
    } else {
      const sequence = await this.sequences.next('client', year);
      code = formatSequenceNumber(settings.clientPrefix, year, sequence);
    }

    const created = await this.clients.create(
      {
        ...input,
        code,
        companyId: input.companyId || null,
        workflow,
        status: input.status ?? 'new',
      },
      context.actor.id,
    );

    await this.audit.record(context, {
      action: 'ایجاد پرونده',
      entity: 'client',
      entityId: created.id,
      entityLabel: created.fullName,
    });

    return created;
  }

  async update(id: string, input: Partial<ClientInput>, context: AuditContext): Promise<Client> {
    const existing = await this.clients.findById(id);
    if (!existing) throw new NotFoundError('Case file');

    if (input.companyId) await this.assertCompany(input.companyId);

    if (input.code && input.code !== existing.code) {
      if (await this.clients.codeExists(input.code)) {
        throw new ConflictError('A case file with this code already exists.');
      }
    }

    const updated = await this.clients.update(id, {
      ...input,
      code: input.code?.trim(),
      companyId: input.companyId === '' ? null : input.companyId,
    });
    if (!updated) throw new NotFoundError('Case file');

    await this.audit.record(context, {
      action: 'ویرایش پرونده',
      entity: 'client',
      entityId: id,
      entityLabel: updated.fullName,
    });

    return updated;
  }

  async delete(id: string, context: AuditContext): Promise<void> {
    const client = await this.clients.findById(id);
    if (!client) throw new NotFoundError('Case file');

    await this.clients.delete(id);

    await this.audit.record(context, {
      action: 'حذف پرونده',
      entity: 'client',
      entityId: id,
      entityLabel: client.fullName,
    });
  }

  private async assertCompany(companyId?: string | null): Promise<void> {
    if (!companyId) return;
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new ValidationError([{ field: 'companyId', message: 'Company not found.' }]);
    }
  }
}
