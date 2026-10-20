import { NotFoundError, ValidationError } from '../errors/index.js';
import type { ClientRepository } from '../repositories/client.repository.js';
import type { DocumentFilters, DocumentRepository } from '../repositories/document.repository.js';
import type { ScanRepository } from '../repositories/scan.repository.js';
import type { SequenceRepository } from '../repositories/sequence.repository.js';
import type { SettingsRepository } from '../repositories/settings.repository.js';
import type { TemplateRepository } from '../repositories/template.repository.js';
import type { DocRecord, DocStatus } from '../types/domain.js';
import { jalaliYear } from '../utils/jalali.js';
import { formatSequenceNumber } from '../utils/sequence.js';
import { autofillValues, missingRequiredFields, pickTemplateValues } from '../utils/template.js';
import type { AuditContext, AuditService } from './audit.service.js';
import type { FileStorage } from './storage.service.js';

export interface CreateDocumentInput {
  templateId: string;
  clientId?: string | null;
  values?: Record<string, string>;
  status?: DocStatus;
  tags?: string[];
  notes?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  values?: Record<string, string>;
  tags?: string[];
  notes?: string | null;
}

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly templates: TemplateRepository,
    private readonly clients: ClientRepository,
    private readonly scans: ScanRepository,
    private readonly settings: SettingsRepository,
    private readonly sequences: SequenceRepository,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
  ) {}

  async list(filters: DocumentFilters): Promise<{ items: DocRecord[]; total: number }> {
    return this.documents.list(filters);
  }

  async getById(id: string): Promise<DocRecord> {
    const document = await this.documents.findById(id);
    if (!document) throw new NotFoundError('Document');
    return document;
  }

  async create(input: CreateDocumentInput, context: AuditContext): Promise<DocRecord> {
    const template = await this.templates.findById(input.templateId);
    if (!template) throw new NotFoundError('Template');

    const client = input.clientId ? await this.clients.findById(input.clientId) : null;
    if (input.clientId && !client) throw new NotFoundError('Case file');

    const values = {
      ...autofillValues(template.fields, client ?? undefined),
      ...pickTemplateValues(template.fields, input.values ?? {}),
    };

    this.assertRequiredValues(template.fields, values);

    const settings = await this.settings.get();
    const year = jalaliYear();
    const sequence = await this.sequences.next('document', year);

    const created = await this.documents.create({
      number: formatSequenceNumber(settings.docPrefix, year, sequence),
      title: template.title,
      templateId: template.id,
      templateTitle: template.title,
      templateVersion: template.version,
      clientId: client?.id ?? null,
      clientName: client?.fullName ?? null,
      clientCode: client?.code ?? null,
      values,
      status: input.status ?? 'draft',
      tags: input.tags ?? [],
      notes: input.notes,
      createdBy: context.actor.id,
      createdByName: context.actor.name,
    });

    await this.audit.record(context, {
      action: 'ایجاد سند',
      entity: 'document',
      entityId: created.id,
      entityLabel: created.title,
      detail: client ? `بر پایه پرونده ${client.fullName}` : 'بدون پرونده',
    });

    return created;
  }

  async update(id: string, input: UpdateDocumentInput, context: AuditContext): Promise<DocRecord> {
    const existing = await this.documents.findById(id);
    if (!existing) throw new NotFoundError('Document');

    let values = input.values;
    if (values && existing.templateId) {
      const template = await this.templates.findById(existing.templateId);
      if (template) {
        values = { ...existing.values, ...pickTemplateValues(template.fields, values) };
        this.assertRequiredValues(template.fields, values);
      }
    }

    const updated = await this.documents.update(id, {
      title: input.title?.trim(),
      values,
      tags: input.tags,
      notes: input.notes,
    });
    if (!updated) throw new NotFoundError('Document');

    await this.audit.record(context, {
      action: 'ویرایش سند',
      entity: 'document',
      entityId: id,
      entityLabel: updated.title,
    });

    return updated;
  }

  async changeStatus(id: string, status: DocStatus, context: AuditContext): Promise<DocRecord> {
    const existing = await this.documents.findById(id);
    if (!existing) throw new NotFoundError('Document');
    if (existing.status === status) return existing;

    const updated = await this.documents.changeStatus(id, status, context.actor.id);
    if (!updated) throw new NotFoundError('Document');

    await this.audit.record(context, {
      action: 'تغییر وضعیت سند',
      entity: 'document',
      entityId: id,
      entityLabel: updated.title,
      detail: `${existing.status} → ${status}`,
    });

    return updated;
  }

  async markPrinted(id: string, context: AuditContext): Promise<DocRecord> {
    const existing = await this.documents.findById(id);
    if (!existing) throw new NotFoundError('Document');

    const updated = await this.documents.update(id, { printedAt: new Date() });
    if (!updated) throw new NotFoundError('Document');

    await this.audit.record(context, {
      action: 'چاپ سند',
      entity: 'document',
      entityId: id,
      entityLabel: updated.title,
    });

    return updated;
  }

  private assertRequiredValues(fields: Parameters<typeof missingRequiredFields>[0], values: Record<string, string>): void {
    const missing = missingRequiredFields(fields, values);
    if (!missing.length) return;
    throw new ValidationError(
      missing.map((field) => ({
        field: `values.${field.key}`,
        message: `"${field.label}" is required.`,
      })),
      'Required template fields are missing.',
    );
  }

  async delete(id: string, context: AuditContext): Promise<void> {
    const document = await this.documents.findById(id);
    if (!document) throw new NotFoundError('Document');

    const scans = await this.scans.listByDocument(id);
    for (const scan of scans) {
      await this.storage.delete(scan.blobKey);
    }
    await this.documents.delete(id);

    await this.audit.record(context, {
      action: 'حذف سند',
      entity: 'document',
      entityId: id,
      entityLabel: document.title,
    });
  }

}
