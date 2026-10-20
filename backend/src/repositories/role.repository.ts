import type { QueryResultRow } from 'pg';
import { query, withTransaction } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { ListOptions, PermissionRole } from '../types/domain.js';

export interface RoleFilters extends ListOptions {
  system?: boolean;
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
  createdBy: string;
  code?: string;
  system?: boolean;
}

interface RoleRow extends QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: Date;
  created_by: string | null;
  permissions: string[] | null;
}

const SELECT_ROLE = `
  select r.*,
         coalesce((
           select array_agg(rp.permission_key order by rp.permission_key)
           from role_permissions rp
           where rp.role_id = r.id
         ), '{}') as permissions
  from roles r
`;

function mapRole(row: RoleRow): PermissionRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    permissions: row.permissions ?? [],
    system: row.is_system,
    createdAt: (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString(),
    createdBy: row.created_by ?? 'system',
  };
}

export class RoleRepository {
  async list(filters: RoleFilters): Promise<{ items: PermissionRole[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(`(r.name ilike $${params.length} or coalesce(r.description, '') ilike $${params.length})`);
    }
    if (filters.system !== undefined) {
      params.push(filters.system);
      where.push(`r.is_system = $${params.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = { name: 'r.name', createdAt: 'r.created_at' };
    const sortColumn = sortable[filters.sortBy ?? 'name'] ?? 'r.name';
    const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from roles r ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<RoleRow>(
      `${SELECT_ROLE} ${whereSql}
       order by r.is_system desc, ${sortColumn} ${direction}
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map(mapRole),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findById(id: string): Promise<PermissionRole | null> {
    const result = await query<RoleRow>(`${SELECT_ROLE} where r.id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapRole(row) : null;
  }

  async findByCode(code: string): Promise<PermissionRole | null> {
    const result = await query<RoleRow>(`${SELECT_ROLE} where r.code = $1`, [code]);
    const row = result.rows[0];
    return row ? mapRole(row) : null;
  }

  async create(input: RoleInput): Promise<PermissionRole> {
    return withTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `insert into roles (code, name, description, is_system, created_by)
         values ($1, $2, $3, $4, $5) returning id`,
        [input.code ?? null, input.name, input.description ?? null, input.system ?? false, input.createdBy],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('Failed to create role');
      if (input.permissions.length) {
        await client.query(
          `insert into role_permissions (role_id, permission_key)
           select $1, unnest($2::text[])`,
          [id, input.permissions],
        );
      }
      const result = await client.query<RoleRow>(`${SELECT_ROLE} where r.id = $1`, [id]);
      const row = result.rows[0];
      if (!row) throw new Error('Failed to load created role');
      return mapRole(row);
    });
  }

  async update(
    id: string,
    patch: { name?: string; description?: string | null; permissions?: string[] },
  ): Promise<PermissionRole | null> {
    return withTransaction(async (client) => {
      const assignments: string[] = [];
      const params: QueryParam[] = [];
      const set = (column: string, value: QueryParam) => {
        params.push(value);
        assignments.push(`${column} = $${params.length}`);
      };

      if (patch.name !== undefined) set('name', patch.name);
      if (patch.description !== undefined) set('description', patch.description);

      if (assignments.length) {
        params.push(id);
        await client.query(`update roles set ${assignments.join(', ')} where id = $${params.length}`, params);
      }

      if (patch.permissions !== undefined) {
        await client.query('delete from role_permissions where role_id = $1', [id]);
        if (patch.permissions.length) {
          await client.query(
            `insert into role_permissions (role_id, permission_key)
             select $1, unnest($2::text[])`,
            [id, patch.permissions],
          );
        }
      }

      const result = await client.query<RoleRow>(`${SELECT_ROLE} where r.id = $1`, [id]);
      const row = result.rows[0];
      return row ? mapRole(row) : null;
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('delete from roles where id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
