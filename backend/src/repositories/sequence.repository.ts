import { query } from '../config/database.js';
import type { DbClient } from '../config/database.js';

export type SequenceKind = 'client' | 'document';

interface SequenceRow {
  last_number: number;
}

/** Atomically reserve the next number for a kind/year pair. */
export class SequenceRepository {
  async next(kind: SequenceKind, year: string, client?: DbClient): Promise<number> {
    const sql = `
      insert into number_sequences (kind, year, last_number)
      values ($1, $2, 1)
      on conflict (kind, year)
      do update set last_number = number_sequences.last_number + 1
      returning last_number
    `;
    const params = [kind, year];
    const result = client
      ? await client.query<SequenceRow>(sql, params)
      : await query<SequenceRow>(sql, params);
    const value = result.rows[0]?.last_number;
    if (value === undefined) throw new Error('Failed to reserve a sequence number');
    return Number(value);
  }
}
