import type { RequestHandler } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { BadRequestError, UnsupportedMediaTypeError } from '../errors/index.js';
import { ALLOWED_UPLOAD_MIME_TYPES } from '../services/storage.service.js';
import type { UploadedFile } from '../services/storage.service.js';

const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      callback(new UnsupportedMediaTypeError(`Unsupported file type: ${file.mimetype}.`));
      return;
    }
    callback(null, true);
  },
});

/** Detect the real container type from magic bytes (clients can spoof MIME). */
function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

/** Parse one `file` part, verify its signature and expose it on req.file. */
export const uploadSingleFile: RequestHandler[] = [
  upload.single('file'),
  (req, _res, next) => {
    const file = req.file;
    if (!file) {
      next(new BadRequestError('A file is required in the "file" field.'));
      return;
    }

    const detected = detectMime(file.buffer);
    if (!detected) {
      next(new UnsupportedMediaTypeError('The file content does not match a supported image or PDF format.'));
      return;
    }
    if (detected !== file.mimetype) {
      next(new UnsupportedMediaTypeError('The declared file type does not match the file content.'));
      return;
    }

    next();
  },
];

export function toUploadedFile(file: Express.Multer.File): UploadedFile {
  return {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 255),
    size: file.size,
  };
}

export { MAX_UPLOAD_BYTES };
