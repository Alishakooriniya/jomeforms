import { withTransaction } from '../config/database.js';
import { ConflictError, NotFoundError } from '../errors/index.js';
import { findStep, isStepActionable, statusAfterStep } from '../domain/workflow.js';
import type { ClientRepository } from '../repositories/client.repository.js';
import type { Client, ClientStatus, WorkflowEvidence } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';
import type { FileStorage, UploadedFile } from './storage.service.js';

export class WorkflowService {
  constructor(
    private readonly clients: ClientRepository,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
  ) {}

  async uploadEvidence(
    clientId: string,
    stepId: string,
    file: UploadedFile,
    context: AuditContext,
  ): Promise<WorkflowEvidence> {
    const result = await withTransaction(async (tx) => {
      const client = await this.clients.lockById(tx, clientId);
      if (!client) throw new NotFoundError('Case file');

      const target = findStep(client.workflow, stepId);
      if (!target) throw new NotFoundError('Workflow step');
      if (target.step.status === 'completed') {
        throw new ConflictError('This step is already completed.');
      }
      if (!isStepActionable(client.workflow, target.index)) {
        throw new ConflictError('Complete the previous step first.');
      }

      const stored = await this.storage.save(file);
      const evidence = await this.clients.addEvidence(tx, {
        clientId,
        stepId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: stored.size,
        storageKey: stored.key,
        checksum: stored.checksum,
        uploadedBy: context.actor.id,
      });

      const workflow = client.workflow.map((step) =>
        step.id === stepId ? { ...step, evidenceIds: [...step.evidenceIds, evidence.id] } : step,
      );
      await this.clients.saveWorkflow(tx, clientId, workflow, client.status);

      return { evidence, clientName: client.fullName, stepTitle: target.step.title };
    });

    await this.audit.record(context, {
      action: 'بارگذاری مدرک مرحله پرونده',
      entity: 'client',
      entityId: clientId,
      entityLabel: result.clientName,
      detail: `${result.stepTitle} — ${file.originalname}`,
    });

    return result.evidence;
  }

  async completeStep(
    clientId: string,
    stepId: string,
    context: AuditContext,
  ): Promise<{ client: Client; status: ClientStatus }> {
    const result = await withTransaction(async (tx) => {
      const client = await this.clients.lockById(tx, clientId);
      if (!client) throw new NotFoundError('Case file');

      const target = findStep(client.workflow, stepId);
      if (!target) throw new NotFoundError('Workflow step');
      if (target.step.status === 'completed') {
        throw new ConflictError('This step is already completed.');
      }
      if (!isStepActionable(client.workflow, target.index)) {
        throw new ConflictError('Complete the previous step first.');
      }
      if (target.step.requiresEvidence && target.step.evidenceIds.length === 0) {
        throw new ConflictError('Upload the evidence or receipt for this step before continuing.');
      }

      const completedAt = new Date().toISOString();
      const workflow = client.workflow.map((step) =>
        step.id === stepId
          ? { ...step, status: 'completed' as const, completedAt, completedBy: context.actor.name }
          : step,
      );
      const status = statusAfterStep(target.step, client.status);
      const saved = await this.clients.saveWorkflow(tx, clientId, workflow, status);

      return { client: saved, stepTitle: target.step.title };
    });

    await this.audit.record(context, {
      action: 'تکمیل مرحله پرونده',
      entity: 'client',
      entityId: clientId,
      entityLabel: result.client.fullName,
      detail: result.stepTitle,
    });

    return { client: result.client, status: result.client.status };
  }

  async overrideStep(
    clientId: string,
    stepId: string,
    reason: string,
    context: AuditContext,
  ): Promise<{ client: Client }> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) throw new ConflictError('An override reason is required.');

    const result = await withTransaction(async (tx) => {
      const client = await this.clients.lockById(tx, clientId);
      if (!client) throw new NotFoundError('Case file');

      const target = findStep(client.workflow, stepId);
      if (!target) throw new NotFoundError('Workflow step');
      if (target.step.status === 'completed') {
        throw new ConflictError('This step is already completed.');
      }
      if (!isStepActionable(client.workflow, target.index)) {
        throw new ConflictError('Complete the previous step first.');
      }

      const completedAt = new Date().toISOString();
      const workflow = client.workflow.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: 'completed' as const,
              completedAt,
              completedBy: context.actor.name,
              overrideReason: trimmedReason,
            }
          : step,
      );
      const status = statusAfterStep(target.step, client.status);
      const saved = await this.clients.saveWorkflow(tx, clientId, workflow, status);

      return { client: saved, stepTitle: target.step.title };
    });

    await this.audit.record(context, {
      action: 'مدیر عبور از شرط مرحله پرونده',
      entity: 'client',
      entityId: clientId,
      entityLabel: result.client.fullName,
      detail: `${result.stepTitle} — دلیل: ${trimmedReason}`,
    });

    return { client: result.client };
  }

  async getEvidenceFile(id: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const evidence = await this.clients.findEvidenceById(id);
    if (!evidence) throw new NotFoundError('Evidence');
    return {
      buffer: await this.storage.read(evidence.storageKey),
      mimeType: evidence.mime,
      fileName: evidence.name,
    };
  }
}
