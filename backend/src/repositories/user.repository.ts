import type { QueryResultRow } from 'pg';
import { query, withTransaction } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { ListOptions, RoleId, User, UserRecord } from '../types/domain.js';

export interface UserFilters extends ListOptions {
  role?: RoleId;
  active?: boolean;
  companyId?: string;
}

export interface CreateUserData {
  username: string;
  fullName: string;
  passwordHash: string;
  role: RoleId;
  permissions: string[];
  title?: string;
  mobile?: string;
  companyId?: string | null;
  active: boolean;
  note?: string;
  createdBy: string;
}

export interface UpdateUserData {
  username?: string;
  fullName?: string;
  passwordHash?: string;
  role?: RoleId;
  permissions?: string[];
  title?: string | null;
  mobile?: string | null;
  companyId?: string | null;
  active?: boolean;
  note?: string | null;
}

interface UserRow extends QueryResultRow {
  id: string;
  username: string;
  full_name: string;
  password_hash: string;
  role: RoleId;
  company_id: string | null;
  title: string | null;
  mobile: string | null;
  active: boolean;
  note: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  permissions: string[] | null;
}

const SELECT_USER = `
  select u.*,
         coalesce((
           select array_agg(up.permission_key order by up.permission_key)
           from user_permissions up
           where up.user_id = u.id
         ), '{}') as permissions
  from users u
`;

function toISOString(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    role: row.role,
    permissions: row.role === 'superadmin' ? ['*'] : (row.permissions ?? []),
    title: row.title ?? undefined,
    mobile: row.mobile ?? undefined,
    companyId: row.company_id ?? undefined,
    active: row.active,
    createdAt: toISOString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toISOString(row.updated_at),
    lastLoginAt: toISOString(row.last_login_at),
    note: row.note ?? undefined,
  };
}

export class UserRepository {
  async findById(id: string): Promise<UserRecord | null> {
    const result = await query<UserRow>(`${SELECT_USER} where u.id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const result = await query<UserRow>(`${SELECT_USER} where lower(u.username) = lower($1)`, [username]);
    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async list(filters: UserFilters): Promise<{ items: User[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(
        `(u.full_name ilike $${params.length} or u.username ilike $${params.length} or u.mobile ilike $${params.length})`,
      );
    }
    if (filters.role) {
      params.push(filters.role);
      where.push(`u.role = $${params.length}`);
    }
    if (filters.active !== undefined) {
      params.push(filters.active);
      where.push(`u.active = $${params.length}`);
    }
    if (filters.companyId) {
      params.push(filters.companyId);
      where.push(`u.company_id = $${params.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      fullName: 'u.full_name',
      username: 'u.username',
      role: 'u.role',
      createdAt: 'u.created_at',
      lastLoginAt: 'u.last_login_at',
    };
    const sortColumn = sortable[filters.sortBy ?? 'fullName'] ?? 'u.full_name';
    const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from users u ${whereSql}`,
      params,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<UserRow>(
      `${SELECT_USER} ${whereSql}
       order by ${sortColumn} ${direction} nulls last, u.id
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return { items: result.rows.map(mapUser), total };
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    return withTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `insert into users
          (username, full_name, password_hash, role, title, mobile, company_id, active, note, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id`,
        [
          data.username.toLowerCase(),
          data.fullName,
          data.passwordHash,
          data.role,
          data.title ?? null,
          data.mobile ?? null,
          data.companyId ?? null,
          data.active,
          data.note ?? null,
          data.createdBy,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('Failed to create user');

      if (data.role !== 'superadmin' && data.permissions.length) {
        await client.query(
          `insert into user_permissions (user_id, permission_key, granted_by)
           select $1, unnest($2::text[]), $3`,
          [id, data.permissions, data.createdBy],
        );
      }

      const result = await client.query<UserRow>(`${SELECT_USER} where u.id = $1`, [id]);
      const row = result.rows[0];
      if (!row) throw new Error('Failed to load created user');
      return mapUser(row);
    });
  }

  async update(id: string, patch: UpdateUserData): Promise<UserRecord | null> {
    return withTransaction(async (client) => {
      const assignments: string[] = [];
      const params: QueryParam[] = [];

      const set = (column: string, value: QueryParam) => {
        params.push(value);
        assignments.push(`${column} = $${params.length}`);
      };

      if (patch.username !== undefined) set('username', patch.username.toLowerCase());
      if (patch.fullName !== undefined) set('full_name', patch.fullName);
      if (patch.passwordHash !== undefined) set('password_hash', patch.passwordHash);
      if (patch.role !== undefined) set('role', patch.role);
      if (patch.title !== undefined) set('title', patch.title);
      if (patch.mobile !== undefined) set('mobile', patch.mobile);
      if (patch.companyId !== undefined) set('company_id', patch.companyId);
      if (patch.active !== undefined) set('active', patch.active);
      if (patch.note !== undefined) set('note', patch.note);

      if (assignments.length) {
        params.push(id);
        await client.query(
          `update users set ${assignments.join(', ')}, updated_at = now() where id = $${params.length}`,
          params,
        );
      }

      if (patch.permissions !== undefined) {
        await client.query('delete from user_permissions where user_id = $1', [id]);
        if (patch.permissions.length) {
          await client.query(
            `insert into user_permissions (user_id, permission_key)
             select $1, unnest($2::text[])`,
            [id, patch.permissions],
          );
        }
      }

      const result = await client.query<UserRow>(`${SELECT_USER} where u.id = $1`, [id]);
      const row = result.rows[0];
      return row ? mapUser(row) : null;
    });
  }

  async replacePermissions(userId: string, permissions: string[], grantedBy: string): Promise<UserRecord | null> {
    return withTransaction(async (client) => {
      await client.query('delete from user_permissions where user_id = $1', [userId]);
      if (permissions.length) {
        await client.query(
          `insert into user_permissions (user_id, permission_key, granted_by)
           select $1, unnest($2::text[]), $3`,
          [userId, permissions, grantedBy],
        );
      }
      const result = await client.query<UserRow>(`${SELECT_USER} where u.id = $1`, [userId]);
      const row = result.rows[0];
      return row ? mapUser(row) : null;
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('delete from users where id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async touchLogin(id: string): Promise<void> {
    await query('update users set last_login_at = now() where id = $1', [id]);
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    const result = await query<UserRow>(
      `${SELECT_USER} where u.id = any($1::uuid[]) order by u.full_name`,
      [ids],
    );
    return result.rows.map(mapUser);
  }

  async listCompanyMemberIds(companyId: string): Promise<string[]> {
    const result = await query<{ id: string }>(
      'select id from users where company_id = $1',
      [companyId],
    );
    return result.rows.map((row) => row.id);
  }

  async countActiveSuperadmins(): Promise<number> {
    const result = await query<{ count: string }>(
      `select count(*)::text as count from users where role = 'superadmin' and active = true`,
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async detachCompany(companyId: string): Promise<number> {
    const result = await query(
      'update users set company_id = null, updated_at = now() where company_id = $1',
      [companyId],
    );
    return result.rowCount ?? 0;
  }

  async syncCompanyMembers(companyId: string, userIds: string[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        'update users set company_id = null, updated_at = now() where company_id = $1 and id <> all($2::uuid[])',
        [companyId, userIds],
      );
      if (userIds.length) {
        await client.query(
          'update users set company_id = $1, updated_at = now() where id = any($2::uuid[])',
          [companyId, userIds],
        );
      }
    });
  }
}
