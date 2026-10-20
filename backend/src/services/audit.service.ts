import { logger } from '../config/logger.js';
import type { AuditFilters } from '../repositories/audit.repository.js';
import type { AuditRepository } from '../repositories/audit.repository.js';
import type { Actor, AuditEntity, AuditEntry } from '../types/domain.js';

export interface AuditContext {
  actor: Actor;
  ipAddress?: string;
}

export class AuditService {
  constructor(private readonly audit: AuditRepository) {}

  async record(
    context: AuditContext,
    entry: {
      action: string;
      entity: AuditEntity;
      entityId?: string;
      entityLabel?: string;
      detail?: string;
    },
  ): Promise<void> {
    try {
      await this.audit.create({
        userId: context.actor.id,
        userName: context.actor.name,
        ipAddress: context.ipAddress,
        ...entry,
      });
    } catch (error) {
      // Auditing must never take down a successful business operation.
      logger.error({ err: error, entity: entry.entity, action: entry.action }, 'failed to write audit log');
    }
  }

  async list(filters: AuditFilters): Promise<{ items: AuditEntry[]; total: number }> {
    return this.audit.list(filters);
  }

  async recent(limit: number): Promise<AuditEntry[]> {
    return this.audit.recent(limit);
  }

  async clear(context: AuditContext): Promise<number> {
    const removed = await this.audit.clear();
    await this.record(context, {
      action: 'پاک‌کردن گزارش فعالیت',
      entity: 'settings',
      detail: `${removed} رویداد حذف شد`,
    });
    return removed;
  }
}
