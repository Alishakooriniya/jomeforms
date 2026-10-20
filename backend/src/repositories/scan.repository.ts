import type { QueryResultRow } from 'pg';
import { query } from '../config/database.js';
import type { ScanFile } from '../types/domain.js';

interface ScanRow extends QueryResultRow {
  id: string;
  document_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: string;
  storage_key: string;
  pages: number;
  note: string | null;
  uploaded_at: Date;
  uploaded_by_name: string | null;
}

function mapScan(row: ScanRow): ScanFile {
  return {
    id: row.id,
    documentId: row.document_id,
    name: row.file_name,
    mime: row.mime_type,
    size: Number(row.size_bytes),
    blobKey: row.storage_key,
    pages: row.pages,
    note: row.note ?? undefined,
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    uploadedBy: row.uploaded_by_name ?? 'system',
  };
}

export interface ScanInput {
  documentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  checksum: string;
  uploadedBy: string;
  pages?: number;
  note?: string;
}

export class ScanRepository {
  async listByDocument(documentId: string): Promise<ScanFile[]> {
    const result = await query<ScanRow>(
      `select s.*, u.full_name as uploaded_by_name
       from document_scans s
       left join users u on u.id = s.uploaded_by
       where s.document_id = $1
       order by s.uploaded_at desc`,
      [documentId],
    );
    return result.rows.map(mapScan);
  }

  async findById(id: string): Promise<ScanFile | null> {
    const result = await query<ScanRow>(
      `select s.*, u.full_name as uploaded_by_name
       from document_scans s
       left join users u on u.id = s.uploaded_by
       where s.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapScan(row) : null;
  }

  async create(input: ScanInput): Promise<ScanFile> {
    const result = await query<ScanRow>(
      `insert into document_scans
        (document_id, file_name, mime_type, size_bytes, storage_key, checksum, pages, note, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        input.documentId,
        input.fileName,
        input.mimeType,
        input.size,
        input.storageKey,
        input.checksum,
        input.pages ?? 1,
        input.note ?? null,
        input.uploadedBy,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to store scan');
    const uploader = await query<{ full_name: string }>('select full_name from users where id = $1', [
      input.uploadedBy,
    ]);
    return mapScan({ ...row, uploaded_by_name: uploader.rows[0]?.full_name ?? null });
  }

  async delete(id: string): Promise<ScanFile | null> {
    const result = await query<ScanRow>('delete from document_scans where id = $1 returning *', [id]);
    const row = result.rows[0];
    return row ? mapScan(row) : null;
  }
}
