import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type { ListOptions, Reminder } from '../types/domain.js';

export interface ReminderFilters extends ListOptions {
  userId?: string;
  done?: boolean;
}

export interface ReminderInput {
  title: string;
  note?: string;
  date: string;
  time?: string;
  userId: string;
  createdBy: string;
}

interface ReminderRow extends QueryResultRow {
  id: string;
  title: string;
  note: string | null;
  date: string;
  time: string | null;
  user_id: string;
  user_name: string;
  done: boolean;
  done_at: Date | null;
  created_at: Date;
  created_by: string | null;
  created_by_name: string | null;
}

const SELECT_REMINDER = `
  select r.id, r.title, r.note, r.date, r.time, r.user_id, r.done, r.done_at,
         r.created_at, r.created_by,
         u.full_name as user_name,
         cu.full_name as created_by_name
  from reminders r
  join users u on u.id = r.user_id
  left join users cu on cu.id = r.created_by
`;

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    date: row.date,
    time: row.time ?? undefined,
    userId: row.user_id,
    userName: row.user_name,
    done: row.done,
    doneAt: row.done_at ? new Date(row.done_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by ?? 'system',
    createdByName: row.created_by_name ?? 'سیستم',
  };
}

export class ReminderRepository {
  async list(filters: ReminderFilters): Promise<{ items: Reminder[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.userId) {
      params.push(filters.userId);
      where.push(`r.user_id = $${params.length}`);
    }
    if (filters.done !== undefined) {
      params.push(filters.done);
      where.push(`r.done = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(`(r.title ilike $${params.length} or coalesce(r.note, '') ilike $${params.length} or u.full_name ilike $${params.length})`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const sortable: Record<string, string> = {
      date: 'r.date',
      createdAt: 'r.created_at',
      userName: 'u.full_name',
    };
    const sortColumn = sortable[filters.sortBy ?? 'date'] ?? 'r.date';
    const direction = filters.sortOrder === 'desc' ? 'desc' : 'asc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from reminders r join users u on u.id = r.user_id ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<ReminderRow>(
      `${SELECT_REMINDER} ${whereSql}
       order by r.done asc, ${sortColumn} ${direction}, r.time asc nulls first
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map(mapReminder),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findById(id: string): Promise<Reminder | null> {
    const result = await query<ReminderRow>(`${SELECT_REMINDER} where r.id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapReminder(row) : null;
  }

  async create(input: ReminderInput): Promise<Reminder> {
    const result = await query<{ id: string }>(
      `insert into reminders (title, note, date, time, user_id, created_by)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [input.title, input.note ?? null, input.date, input.time ?? null, input.userId, input.createdBy],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Failed to create reminder');
    const created = await this.findById(id);
    if (!created) throw new Error('Failed to load created reminder');
    return created;
  }

  async markDone(id: string): Promise<Reminder | null> {
    await query('update reminders set done = true, done_at = now() where id = $1 and done = false', [id]);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('delete from reminders where id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
