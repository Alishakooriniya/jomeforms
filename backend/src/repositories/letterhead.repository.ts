import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { QueryParam } from '../config/database.js';
import type {
  LetterheadConfig,
  LetterheadPaper,
  LetterheadPrint,
  LetterheadPrintKind,
  ListOptions,
} from '../types/domain.js';

/** نشانی پیش‌فرض کادر پایین سربرگ — وقتی مدیر هنوز متنی ثبت نکرده است */
export const DEFAULT_LETTERHEAD_ADDRESS =
  'دفتر مرکزی محبوسه: مشهد بلوار سجاد، خیابان میلاد، داخل میلاد ۲ نبش خیابان بنفشه پلاک ۴ زنگ ۲ تلفن: ۳۷۶۷۳۲۴۶؛' +
  '\n' +
  'دفتر منطقه‌ای: مشهد کیلومتر۲۵ جاده آسیایی، جاده کاهو - ۵۰ متر داخل جاده کاهو سمت چپ تلفن: ۹۹۰۲۰۵۷۰۰-۱-۲.';

interface ConfigRow extends QueryResultRow {
  letterhead_address: string | null;
}

interface PrintRow extends QueryResultRow {
  id: string;
  paper: LetterheadPaper;
  kind: LetterheadPrintKind;
  values: Record<string, string>;
  user_id: string | null;
  user_name: string;
  created_at: Date;
}

function mapPrint(row: PrintRow): LetterheadPrint {
  return {
    id: row.id,
    paper: row.paper,
    kind: row.kind,
    values: row.values ?? {},
    userId: row.user_id ?? 'system',
    userName: row.user_name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export interface LetterheadPrintInput {
  paper: LetterheadPaper;
  kind: LetterheadPrintKind;
  values: Record<string, string>;
  userId: string;
  userName: string;
}

export interface LetterheadPrintFilters extends ListOptions {
  userId?: string;
  paper?: LetterheadPaper;
  kind?: LetterheadPrintKind;
}

export class LetterheadRepository {
  async getConfig(): Promise<LetterheadConfig> {
    // همان سیاست تنظیمات: ردیف تک‌نسخه‌ای را در صورت نبودن می‌سازد.
    await query('insert into app_settings (id) values (true) on conflict (id) do nothing');
    const result = await query<ConfigRow>('select letterhead_address from app_settings where id = true');
    return { address: result.rows[0]?.letterhead_address ?? DEFAULT_LETTERHEAD_ADDRESS };
  }

  async updateAddress(address: string | null): Promise<LetterheadConfig> {
    await query('insert into app_settings (id) values (true) on conflict (id) do nothing');
    const result = await query<ConfigRow>(
      'update app_settings set letterhead_address = $1, updated_at = now() where id = true returning letterhead_address',
      [address],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Application settings row is missing');
    return { address: row.letterhead_address ?? DEFAULT_LETTERHEAD_ADDRESS };
  }

  async listPrints(filters: LetterheadPrintFilters): Promise<{ items: LetterheadPrint[]; total: number }> {
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (filters.userId) {
      params.push(filters.userId);
      where.push(`user_id = $${params.length}`);
    }
    if (filters.paper) {
      params.push(filters.paper);
      where.push(`paper = $${params.length}`);
    }
    if (filters.kind) {
      params.push(filters.kind);
      where.push(`kind = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(`(user_name ilike $${params.length} or values::text ilike $${params.length})`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const direction = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await query<{ count: string }>(
      `select count(*)::text as count from letterhead_prints ${whereSql}`,
      params,
    );

    const listParams = [...params, filters.limit, filters.offset];
    const result = await query<PrintRow>(
      `select * from letterhead_prints ${whereSql}
       order by created_at ${direction}, id desc
       limit $${listParams.length - 1} offset $${listParams.length}`,
      listParams,
    );

    return {
      items: result.rows.map(mapPrint),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async createPrint(input: LetterheadPrintInput): Promise<LetterheadPrint> {
    const result = await query<PrintRow>(
      `insert into letterhead_prints (paper, kind, values, user_id, user_name)
       values ($1, $2, $3::jsonb, $4, $5) returning *`,
      [input.paper, input.kind, JSON.stringify(input.values), input.userId, input.userName],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create letterhead print record');
    return mapPrint(row);
  }
}
