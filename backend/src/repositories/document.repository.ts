import type { QueryResultRow } from 'pg';
import { query, withTransaction } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { DocRecord, DocStatus, ListOptions } from '../types/domain.js';
import { jalaliToGregorianIso } from '../utils/jalali.js';

export interface DocumentFilters extends ListOptions {
  status?: DocStatus;
  templateId?: string;
  clientId?: string;
  createdBy?: string;
  from?: string;
  to?: string;
}

export interface DocumentInput {
  number: string;
  title: string;
  templateId: string | null;
  templateTitle: string;
  templateVersion: number;
  clientId?: string | null;
  clientName?: string | null;
  clientCode?: string | null;
  values: Record<string, string>;
  status: DocStatus;
  tags: string[];
  notes?: string | null;
  createdBy: string;
  createdByName: string;
}

interface DocumentRow extends QueryResultRow {
  id: string;
  number: string;
  title: string;
  template_id: string | null;
  template_title: string;
  template_version: number;
  client_id: string | null;
  client_name: string | null;
  client_code: string | null;
  values: Record<string, string>;
  status: DocStatus;
  tags: string[];
  notes: string | null;
  printed_at: Date | null;
  signed_at: Date | null;
  created_by: string | null;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
  scan_ids: string[] | null;
}

const SELECT_DOCUMENT = `
  select d.*,
         coalesce((
           select array_agg(s.id order by s.uploaded_at)
           from document_scans s
           where s.document_id = d.id
         ), '{}') as scan_ids
  from documents d
`;

export function mapDocument(row: DocumentRow): DocRecord {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    templateId: row.template_id ?? '',
    templateTitle: row.template_title,
    templateVersion: row.template_version,
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
    clientCode: row.client_code ?? undefined,
    values: row.values ?? {},
    status: row.status,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    createdBy: row.created_by ?? 'system',
    createdByName: row.created_by_name,
    printedAt: row.printed_at ? new Date(row.printed_at).toISOString() : undefined,
    signedAt: row.signed_at ? new Date(row.signed_at).toISOString() : undefined,
    scanIds: row.scan_ids ?? [],
  };
}

export class DocumentRepository {
  async list(filters: DocumentFilters): Promise<{ items: DocRecord[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const index = params.length;
      where.push(`(
        d.title ilike $${index}
        or d.number ilike $${index}
        or coalesce(d.client_name, '') ilike $${index}
        or coalesce(d.client_code, '') ilike $${index}
        or d.created_by_name ilike $${index}
        or coalesce(d.notes, '') ilike $${index}
        or d.values::text ilike $${index}
      )`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`d.status = $${params.length}`);
    }
    if (filters.templateId) {
      params.push(filters.templateId);
      where.push(`d.template_id = $${params.length}`);
    }
    if (filters.clientId) {
      params.push(filters.clientId);
      where.push(`d.client_id = $${params.length}`);
    }
    if (filters.createdBy) {
      params.push(filters.createdBy);
      where.push(`d.created_by = $${params.length}`);
    }
    if (filters.from) {
      const date = jalaliToGregorianIso(filters.from);
      if (!date) throw new Error('Invalid Jalali document date filter reached the repository.');
      params.push(date);
      where.push(`d.created_at >= $${params.length}::date`);
    }
    if (filters.to) {
      const date = jalaliToGregorianIso(filters.to);
      if (!date) throw new Error('Invalid Jalali document date filter reached the repository.');
      params.push(date);
      where.push(`d.created_at < ($${params.length}::date + interval '1 day')`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      title: 'd.title',
      number: 'd.number',
      status: 'd.status',
      createdAt: 'd.created_at',
      updatedAt: 'd.updated_at',
    };
    const sortColumn = sortable[filters.sortBy ?? 'createdAt'] ?? 'd.created_at';
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from documents d ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<DocumentRow>(
      `${SELECT_DOCUMENT} ${whereSql}
       order by ${sortColumn} ${direction}, d.id
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map(mapDocument),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findById(id: string): Promise<DocRecord | null> {
    const result = await query<DocumentRow>(`${SELECT_DOCUMENT} where d.id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapDocument(row) : null;
  }

  async create(input: DocumentInput): Promise<DocRecord> {
    const result = await query<DocumentRow>(
      `insert into documents
        (number, title, template_id, template_title, template_version, client_id, client_name, client_code,
         values, status, tags, notes, created_by, created_by_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14)
       returning *`,
      [
        input.number,
        input.title,
        input.templateId,
        input.templateTitle,
        input.templateVersion,
        input.clientId ?? null,
        input.clientName ?? null,
        input.clientCode ?? null,
        JSON.stringify(input.values),
        input.status,
        input.tags,
        input.notes ?? null,
        input.createdBy,
        input.createdByName,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create document');
    return mapDocument({ ...row, scan_ids: [] });
  }

  async update(
    id: string,
    patch: {
      title?: string;
      values?: Record<string, string>;
      tags?: string[];
      notes?: string | null;
      printedAt?: Date | null;
    },
  ): Promise<DocRecord | null> {
    const assignments: string[] = [];
    const params: QueryParam[] = [];

    if (patch.title !== undefined) {
      params.push(patch.title);
      assignments.push(`title = $${params.length}`);
    }
    if (patch.values !== undefined) {
      params.push(JSON.stringify(patch.values));
      assignments.push(`values = $${params.length}::jsonb`);
    }
    if (patch.tags !== undefined) {
      params.push(patch.tags);
      assignments.push(`tags = $${params.length}`);
    }
    if (patch.notes !== undefined) {
      params.push(patch.notes);
      assignments.push(`notes = $${params.length}`);
    }
    if (patch.printedAt !== undefined) {
      params.push(patch.printedAt);
      assignments.push(`printed_at = $${params.length}`);
    }

    if (!assignments.length) return this.findById(id);

    params.push(id);
    await query(`update documents set ${assignments.join(', ')}, updated_at = now() where id = $${params.length}`, params);
    return this.findById(id);
  }

  async changeStatus(id: string, status: DocStatus, changedBy: string): Promise<DocRecord | null> {
    return withTransaction(async (client) => {
      const current = await client.query<DocumentRow>(
        'select * from documents where id = $1 for update',
        [id],
      );
      const existing = current.rows[0];
      if (!existing) return null;

      const signedAt =
        status === 'signed' || status === 'scanned'
          ? (existing.signed_at ?? new Date())
          : existing.signed_at;

      const updated = await client.query<DocumentRow>(
        `update documents
         set status = $1, signed_at = $2, updated_at = now()
         where id = $3 returning *`,
        [status, signedAt, id],
      );

      await client.query(
        `insert into document_status_history (document_id, from_status, to_status, changed_by)
         values ($1, $2, $3, $4)`,
        [id, existing.status, status, changedBy],
      );

      if (!updated.rows[0]) throw new Error('Failed to update document status');

      const hydrated = await client.query<DocumentRow>(`${SELECT_DOCUMENT} where d.id = $1`, [id]);
      const row = hydrated.rows[0];
      if (!row) throw new Error('Failed to load updated document');
      return mapDocument(row);
    });
  }

  /** Mark a document as scanned when a signed copy is uploaded. */
  async markScanned(id: string): Promise<void> {
    await query(
      `update documents
       set status = case when status = 'archived' then status else 'scanned' end,
           signed_at = coalesce(signed_at, now()),
           updated_at = now()
       where id = $1`,
      [id],
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('delete from documents where id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async countByTemplate(templateId: string): Promise<number> {
    const result = await query<{ count: string }>(
      'select count(*)::text as count from documents where template_id = $1',
      [templateId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listStatusHistory(
    documentId: string,
  ): Promise<Array<{ fromStatus: DocStatus | null; toStatus: DocStatus; changedAt: string }>> {
    const result = await query<{
      from_status: DocStatus | null;
      to_status: DocStatus;
      changed_at: Date;
    }>(
      `select from_status, to_status, changed_at
       from document_status_history where document_id = $1 order by changed_at desc`,
      [documentId],
    );
    return result.rows.map((row) => ({
      fromStatus: row.from_status,
      toStatus: row.to_status,
      changedAt: new Date(row.changed_at).toISOString(),
    }));
  }
}
