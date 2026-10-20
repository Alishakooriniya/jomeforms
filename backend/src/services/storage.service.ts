import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { env } from '../config/env.js';
import { InternalServerError } from '../errors/index.js';

export interface StoredFile {
  key: string;
  size: number;
  checksum: string;
  mimeType: string;
}

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/tiff': '.tif',
  'application/pdf': '.pdf',
};

export const ALLOWED_UPLOAD_MIME_TYPES = Object.keys(EXTENSIONS);

/**
 * File storage is isolated behind this interface so deployments can swap the
 * local disk for S3-compatible object storage without touching services.
 */
export interface FileStorage {
  save(file: UploadedFile): Promise<StoredFile>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalDiskStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string = env.UPLOAD_DIR) {
    this.root = resolve(root);
  }

  async save(file: UploadedFile): Promise<StoredFile> {
    const extension = EXTENSIONS[file.mimetype] ?? (extname(file.originalname).toLowerCase() || '.bin');
    const now = new Date();
    const relative = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}${extension}`;
    const absolute = this.resolveKey(relative);

    try {
      await mkdir(resolve(absolute, '..'), { recursive: true });
      await writeFile(absolute, file.buffer, { mode: 0o600 });
    } catch (error) {
      throw new InternalServerError('Failed to store the uploaded file.', error);
    }

    return {
      key: relative,
      size: file.size,
      checksum: createHash('sha256').update(file.buffer).digest('hex'),
      mimeType: file.mimetype,
    };
  }

  async read(key: string): Promise<Buffer> {
    try {
      return await readFile(this.resolveKey(key));
    } catch (error) {
      throw new InternalServerError('The requested file could not be read.', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw new InternalServerError('Failed to delete the stored file.', error);
    }
  }

  /** Prevent path traversal outside the configured upload root. */
  private resolveKey(key: string): string {
    const absolute = resolve(this.root, key);
    if (absolute !== this.root && !absolute.startsWith(this.root + sep)) {
      throw new InternalServerError('Invalid storage key.');
    }
    return absolute;
  }
}
