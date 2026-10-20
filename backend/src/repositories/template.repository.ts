import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type {
  FormTemplate,
  FormTemplateWithUsage,
  ListOptions,
  TemplateCategory,
  TemplateField,
} from '../types/domain.js';

export interface TemplateFilters extends ListOptions {
  category?: TemplateCategory;
  active?: boolean;
}

export interface TemplateInput {
  title: string;
  category: TemplateCategory;
  description?: string | null;
  fields: TemplateField[];
  body: string;
  headerNote?: string | null;
  footerNote?: string | null;
  requiresSignature: boolean;
  active: boolean;
  version: number;
}

interface TemplateRow extends QueryResultRow {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string | null;
  fields: TemplateField[];
  body: string;
  header_note: string | null;
  footer_note: string | null;
  requires_signature: boolean;
  active: boolean;
  version: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  document_count?: string | number;
}

const SELECT_TEMPLATE = `
  select t.*,
         (select count(*)::int from documents d where d.template_id = t.id) as document_count
  from form_templates t
`;

export function mapTemplate(row: TemplateRow): FormTemplate {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description ?? undefined,
    fields: row.fields ?? [],
    body: row.body,
    headerNote: row.header_note ?? undefined,
    footerNote: row.footer_note ?? undefined,
    requiresSignature: row.requires_signature,
    active: row.active,
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    createdBy: row.created_by ?? 'system',
  };
}

const COLUMNS: Record<keyof TemplateInput, string> = {
  title: 'title',
  category: 'category',
  description: 'description',
  fields: 'fields',
  body: 'body',
  headerNote: 'header_note',
  footerNote: 'footer_note',
  requiresSignature: 'requires_signature',
  active: 'active',
  version: 'version',
};

export class TemplateRepository {
  async list(filters: TemplateFilters): Promise<{ items: FormTemplateWithUsage[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(`(t.title ilike $${params.length} or coalesce(t.description, '') ilike $${params.length})`);
    }
    if (filters.category) {
      params.push(filters.category);
      where.push(`t.category = $${params.length}`);
    }
    if (filters.active !== undefined) {
      params.push(filters.active);
      where.push(`t.active = $${params.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      title: 't.title',
      createdAt: 't.created_at',
      updatedAt: 't.updated_at',
      version: 't.version',
    };
    const sortColumn = sortable[filters.sortBy ?? 'updatedAt'] ?? 't.updated_at';
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from form_templates t ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<TemplateRow>(
      `${SELECT_TEMPLATE} ${whereSql}
       order by ${sortColumn} ${direction}, t.id
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map((row) => ({
        ...mapTemplate(row),
        documentCount: Number(row.document_count ?? 0),
      })),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findById(id: string): Promise<FormTemplateWithUsage | null> {
    const result = await query<TemplateRow>(`${SELECT_TEMPLATE} where t.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    return { ...mapTemplate(row), documentCount: Number(row.document_count ?? 0) };
  }

  async create(input: TemplateInput, createdBy: string): Promise<FormTemplate> {
    const result = await query<TemplateRow>(
      `insert into form_templates
        (title, category, description, fields, body, header_note, footer_note,
         requires_signature, active, version, created_by)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
       returning *`,
      [
        input.title,
        input.category,
        input.description ?? null,
        JSON.stringify(input.fields),
        input.body,
        input.headerNote ?? null,
        input.footerNote ?? null,
        input.requiresSignature,
        input.active,
        input.version,
        createdBy,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create template');
    return mapTemplate(row);
  }

  async update(id: string, patch: Partial<TemplateInput>): Promise<FormTemplate | null> {
    const assignments: string[] = [];
    const params: QueryParam[] = [];

    for (const [key, value] of Object.entries(patch) as Array<[keyof TemplateInput, unknown]>) {
      if (value === undefined) continue;
      params.push((key === 'fields' ? JSON.stringify(value) : value) as QueryParam);
      const cast = key === 'fields' ? '::jsonb' : '';
      assignments.push(`${COLUMNS[key]} = $${params.length}${cast}`);
    }

    if (!assignments.length) return (await this.findById(id)) ?? null;

    params.push(id);
    const result = await query<TemplateRow>(
      `update form_templates set ${assignments.join(', ')}, updated_at = now()
       where id = $${params.length} returning *`,
      params,
    );
    const row = result.rows[0];
    return row ? mapTemplate(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('delete from form_templates where id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Store an immutable snapshot of a published template version. */
  async saveVersion(template: FormTemplate, changedBy: string): Promise<void> {
    await query(
      `insert into form_template_versions (template_id, version, title, fields, body, changed_by)
       values ($1, $2, $3, $4::jsonb, $5, $6)
       on conflict (template_id, version) do nothing`,
      [
        template.id,
        template.version,
        template.title,
        JSON.stringify(template.fields),
        template.body,
        changedBy,
      ],
    );
  }
}
