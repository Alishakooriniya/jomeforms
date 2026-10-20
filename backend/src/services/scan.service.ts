import { NotFoundError } from '../errors/index.js';
import type { DocumentRepository } from '../repositories/document.repository.js';
import type { ScanRepository } from '../repositories/scan.repository.js';
import type { ScanFile } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';
import type { FileStorage, UploadedFile } from './storage.service.js';

export class ScanService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly scans: ScanRepository,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
  ) {}

  async list(documentId: string): Promise<ScanFile[]> {
    const document = await this.documents.findById(documentId);
    if (!document) throw new NotFoundError('Document');
    return this.scans.listByDocument(documentId);
  }

  async upload(documentId: string, file: UploadedFile, context: AuditContext): Promise<ScanFile> {
    const document = await this.documents.findById(documentId);
    if (!document) throw new NotFoundError('Document');

    const stored = await this.storage.save(file);
    const scan = await this.scans.create({
      documentId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: stored.size,
      storageKey: stored.key,
      checksum: stored.checksum,
      uploadedBy: context.actor.id,
    });

    await this.documents.markScanned(documentId);

    await this.audit.record(context, {
      action: 'بارگذاری اسکن امضاشده',
      entity: 'scan',
      entityId: scan.id,
      entityLabel: document.title,
      detail: file.originalname,
    });

    return scan;
  }

  async delete(documentId: string, scanId: string, context: AuditContext): Promise<void> {
    const scan = await this.scans.findById(scanId);
    if (!scan || scan.documentId !== documentId) throw new NotFoundError('Scan');

    await this.storage.delete(scan.blobKey);
    await this.scans.delete(scanId);

    await this.audit.record(context, {
      action: 'حذف اسکن',
      entity: 'scan',
      entityId: scanId,
      entityLabel: scan.name,
    });
  }

  async getFile(
    documentId: string,
    scanId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const scan = await this.scans.findById(scanId);
    if (!scan || scan.documentId !== documentId) throw new NotFoundError('Scan');

    return {
      buffer: await this.storage.read(scan.blobKey),
      mimeType: scan.mime,
      fileName: scan.name,
    };
  }
}
