import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../errors/index.js';
import type { TemplateFilters, TemplateInput, TemplateRepository } from '../repositories/template.repository.js';
import type { FormTemplate, FormTemplateWithUsage, TemplateCategory } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';

export type CreateTemplateInput = Omit<TemplateInput, 'version'> & { version?: number };

export class TemplateService {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly audit: AuditService,
  ) {}

  async list(filters: TemplateFilters): Promise<{ items: FormTemplateWithUsage[]; total: number }> {
    return this.templates.list(filters);
  }

  async getById(id: string): Promise<FormTemplateWithUsage> {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundError('Template');
    return template;
  }

  async create(input: CreateTemplateInput, context: AuditContext): Promise<FormTemplate> {
    const created = await this.templates.create(
      {
        title: input.title.trim(),
        category: input.category,
        printLayout: input.printLayout,
        description: input.description,
        fields: input.fields,
        body: input.body,
        headerNote: input.headerNote,
        footerNote: input.footerNote,
        requiresSignature: input.requiresSignature,
        active: input.active,
        version: input.version ?? 1,
      },
      context.actor.id,
    );

    await this.templates.saveVersion(created, context.actor.id);
    await this.audit.record(context, {
      action: 'افزودن قالب فرم',
      entity: 'template',
      entityId: created.id,
      entityLabel: created.title,
    });

    return created;
  }

  async update(id: string, input: Partial<CreateTemplateInput>, context: AuditContext): Promise<FormTemplate> {
    const existing = await this.templates.findById(id);
    if (!existing) throw new NotFoundError('Template');

    const updated = await this.templates.update(id, {
      ...input,
      title: input.title?.trim(),
    });
    if (!updated) throw new NotFoundError('Template');

    await this.templates.saveVersion(updated, context.actor.id);
    await this.audit.record(context, {
      action: 'ویرایش قالب فرم',
      entity: 'template',
      entityId: id,
      entityLabel: updated.title,
    });

    return updated;
  }

  async duplicate(id: string, context: AuditContext): Promise<FormTemplate> {
    const source = await this.templates.findById(id);
    if (!source) throw new NotFoundError('Template');

    const copy = await this.templates.create(
      {
        title: `${source.title} (کپی)`,
        category: source.category as TemplateCategory,
        printLayout: source.printLayout,
        description: source.description,
        fields: source.fields.map((field) => ({ ...field, id: randomUUID() })),
        body: source.body,
        headerNote: source.headerNote,
        footerNote: source.footerNote,
        requiresSignature: source.requiresSignature,
        active: source.active,
        version: 1,
      },
      context.actor.id,
    );

    await this.templates.saveVersion(copy, context.actor.id);
    await this.audit.record(context, {
      action: 'کپی قالب فرم',
      entity: 'template',
      entityId: copy.id,
      entityLabel: copy.title,
    });

    return copy;
  }

  async delete(id: string, context: AuditContext): Promise<{ documents: number }> {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundError('Template');

    await this.templates.delete(id);
    await this.audit.record(context, {
      action: 'حذف قالب فرم',
      entity: 'template',
      entityId: id,
      entityLabel: template.title,
      detail: template.documentCount
        ? `${template.documentCount} سند ساخته‌شده از این قالب باقی می‌ماند`
        : undefined,
    });

    return { documents: template.documentCount };
  }

}
