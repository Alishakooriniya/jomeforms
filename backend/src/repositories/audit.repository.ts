import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { DbClient, QueryParam } from '../config/database.js';
import type { AuditEntity, AuditEntry, ListOptions } from '../types/domain.js';

export interface AuditFilters extends ListOptions {
  entity?: AuditEntity;
  userId?: string;
  from?: string;
  to?: string;
}

export interface AuditInput {
  userId: string;
  userName: string;
  action: string;
  entity: AuditEntity;
  entityId?: string;
  entityLabel?: string;
  detail?: string;
  ipAddress?: string;
}

interface AuditRow extends QueryResultRow {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity: AuditEntity;
  entity_id: string | null;
  entity_label: string | null;
  detail: string | null;
  created_at: Date;
}

function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: String(row.id),
    at: new Date(row.created_at).toISOString(),
    userId: row.user_id ?? 'system',
    userName: row.user_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id ?? undefined,
    entityLabel: row.entity_label ?? undefined,
    detail: row.detail ?? undefined,
  };
}

export class AuditRepository {
  async list(filters: AuditFilters): Promise<{ items: AuditEntry[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(
        `(user_name ilike $${params.length} or action ilike $${params.length} or coalesce(entity_label, '') ilike $${params.length} or coalesce(detail, '') ilike $${params.length})`,
      );
    }
    if (filters.entity) {
      params.push(filters.entity);
      where.push(`entity = $${params.length}`);
    }
    if (filters.userId) {
      params.push(filters.userId);
      where.push(`user_id = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      where.push(`created_at >= $${params.length}::date`);
    }
    if (filters.to) {
      params.push(filters.to);
      where.push(`created_at < ($${params.length}::date + interval '1 day')`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      at: 'created_at',
      userName: 'user_name',
      action: 'action',
    };
    const sortColumn = sortable[filters.sortBy ?? 'at'] ?? 'created_at';
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from audit_logs ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<AuditRow>(
      `select * from audit_logs ${whereSql}
       order by ${sortColumn} ${direction}, id desc
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map(mapAudit),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async create(entry: AuditInput, client?: DbClient): Promise<AuditEntry> {
    const sql = `
      insert into audit_logs (user_id, user_name, action, entity, entity_id, entity_label, detail, ip_address)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *
    `;
    const params = [
      entry.userId,
      entry.userName,
      entry.action,
      entry.entity,
      entry.entityId ?? null,
      entry.entityLabel ?? null,
      entry.detail ?? null,
      entry.ipAddress ?? null,
    ];
    const result = client
      ? await client.query<AuditRow>(sql, params)
      : await query<AuditRow>(sql, params);
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create audit entry');
    return mapAudit(row);
  }

  async clear(): Promise<number> {
    const result = await query('delete from audit_logs');
    return result.rowCount ?? 0;
  }

  async recent(limit: number): Promise<AuditEntry[]> {
    const result = await query<AuditRow>(
      'select * from audit_logs order by created_at desc, id desc limit $1',
      [limit],
    );
    return result.rows.map(mapAudit);
  }
}
