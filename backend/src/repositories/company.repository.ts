import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { Company, CompanyKind, ListOptions } from '../types/domain.js';

export interface CompanyFilters extends ListOptions {
  kind?: CompanyKind;
  active?: boolean;
}

export interface CompanyInput {
  name: string;
  kind: CompanyKind;
  nationalId?: string | null;
  managerName?: string | null;
  mobile?: string | null;
  phone?: string | null;
  address?: string | null;
  plotCount?: number;
  totalArea?: number;
  note?: string | null;
  active: boolean;
}

interface CompanyRow extends QueryResultRow {
  id: string;
  name: string;
  kind: CompanyKind;
  national_id: string | null;
  manager_name: string | null;
  mobile: string | null;
  phone: string | null;
  address: string | null;
  plot_count: number;
  total_area: string;
  note: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    nationalId: row.national_id ?? undefined,
    managerName: row.manager_name ?? undefined,
    mobile: row.mobile ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    plotCount: row.plot_count,
    totalArea: Number(row.total_area),
    note: row.note ?? undefined,
    active: row.active,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    createdBy: row.created_by ?? 'system',
  };
}

export class CompanyRepository {
  async list(filters: CompanyFilters): Promise<{ items: Company[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(
        `(name ilike $${params.length} or coalesce(manager_name, '') ilike $${params.length} or coalesce(national_id, '') ilike $${params.length} or coalesce(mobile, '') ilike $${params.length})`,
      );
    }
    if (filters.kind) {
      params.push(filters.kind);
      where.push(`kind = $${params.length}`);
    }
    if (filters.active !== undefined) {
      params.push(filters.active);
      where.push(`active = $${params.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      name: 'name',
      kind: 'kind',
      createdAt: 'created_at',
      plotCount: 'plot_count',
    };
    const sortColumn = sortable[filters.sortBy ?? 'name'] ?? 'name';
    const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from companies ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<CompanyRow>(
      `select * from companies ${whereSql}
       order by ${sortColumn} ${direction}, id
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map(mapCompany),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findById(id: string): Promise<Company | null> {
    const result = await query<CompanyRow>('select * from companies where id = $1', [id]);
    const row = result.rows[0];
    return row ? mapCompany(row) : null;
  }

  async create(input: CompanyInput, createdBy: string): Promise<Company> {
    const result = await query<CompanyRow>(
      `insert into companies
        (name, kind, national_id, manager_name, mobile, phone, address, plot_count, total_area, note, active, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        input.name,
        input.kind,
        input.nationalId ?? null,
        input.managerName ?? null,
        input.mobile ?? null,
        input.phone ?? null,
        input.address ?? null,
        input.plotCount ?? 0,
        input.totalArea ?? 0,
        input.note ?? null,
        input.active,
        createdBy,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create company');
    return mapCompany(row);
  }

  async update(id: string, patch: Partial<CompanyInput>): Promise<Company | null> {
    const columns: Record<keyof CompanyInput, string> = {
      name: 'name',
      kind: 'kind',
      nationalId: 'national_id',
      managerName: 'manager_name',
      mobile: 'mobile',
      phone: 'phone',
      address: 'address',
      plotCount: 'plot_count',
      totalArea: 'total_area',
      note: 'note',
      active: 'active',
    };

    const assignments: string[] = [];
    const params: QueryParam[] = [];
    for (const [key, value] of Object.entries(patch) as Array<[keyof CompanyInput, QueryParam]>) {
      if (value === undefined) continue;
      params.push(value);
      assignments.push(`${columns[key]} = $${params.length}`);
    }

    if (!assignments.length) return this.findById(id);

    params.push(id);
    const result = await query<CompanyRow>(
      `update companies set ${assignments.join(', ')}, updated_at = now()
       where id = $${params.length} returning *`,
      params,
    );
    const row = result.rows[0];
    return row ? mapCompany(row) : null;
  }

  async delete(id: string): Promise<Company | null> {
    const result = await query<CompanyRow>('delete from companies where id = $1 returning *', [id]);
    const row = result.rows[0];
    return row ? mapCompany(row) : null;
  }
}
