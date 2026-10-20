import { query } from '../config/database.js';

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
}

export class SessionRepository {
  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<SessionRecord> {
    const result = await query<{ id: string; user_id: string; expires_at: Date }>(
      `insert into sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       values ($1, $2, $3, $4, $5)
       returning id, user_id, expires_at`,
      [
        input.userId,
        input.tokenHash,
        input.expiresAt,
        input.userAgent?.slice(0, 500) ?? null,
        input.ipAddress ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create session');
    return { id: row.id, userId: row.user_id, expiresAt: new Date(row.expires_at) };
  }

  async findByHash(tokenHash: string): Promise<SessionRecord | null> {
    const result = await query<{ id: string; user_id: string; expires_at: Date; expired: boolean }>(
      `select id, user_id, expires_at, expires_at <= now() as expired
       from sessions where token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return null;
    if (row.expired) {
      await this.deleteByHash(tokenHash);
      return null;
    }
    return { id: row.id, userId: row.user_id, expiresAt: new Date(row.expires_at) };
  }

  async deleteByHash(tokenHash: string): Promise<void> {
    await query('delete from sessions where token_hash = $1', [tokenHash]);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await query('delete from sessions where user_id = $1', [userId]);
  }

  async deleteExpired(): Promise<number> {
    const result = await query('delete from sessions where expires_at <= now()');
    return result.rowCount ?? 0;
  }
}
