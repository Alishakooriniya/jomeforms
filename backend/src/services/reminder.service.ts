import { AuthorizationError, NotFoundError, ValidationError } from '../errors/index.js';
import type { ReminderFilters, ReminderRepository } from '../repositories/reminder.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { Reminder } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';

export interface ReminderInput {
  title: string;
  note?: string;
  date: string;
  time?: string;
  userId: string;
}

export class ReminderService {
  constructor(
    private readonly reminders: ReminderRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Managers (`canManage`) may list every recipient's reminders; other users
   * only ever see their own, so the controller pins `forUserId` for them.
   */
  async list(filters: ReminderFilters): Promise<{ items: Reminder[]; total: number }> {
    return this.reminders.list(filters);
  }

  async create(input: ReminderInput, context: AuditContext): Promise<Reminder> {
    const target = await this.users.findById(input.userId);
    if (!target || !target.active) {
      throw new ValidationError([{ field: 'userId', message: 'An active target user is required.' }]);
    }

    const created = await this.reminders.create({ ...input, createdBy: context.actor.id });

    await this.audit.record(context, {
      action: 'ایجاد یادآور',
      entity: 'reminder',
      entityId: created.id,
      entityLabel: target.fullName,
      detail: created.title,
    });

    return created;
  }

  /** The recipient marks their own reminder done; managers may close anyone's. */
  async markDone(id: string, actorId: string, canManage: boolean, context: AuditContext): Promise<Reminder> {
    const reminder = await this.reminders.findById(id);
    if (!reminder) throw new NotFoundError('Reminder');
    if (reminder.userId !== actorId && !canManage) {
      throw new AuthorizationError('Cannot complete another user\'s reminder.');
    }
    if (reminder.done) return reminder;

    const updated = await this.reminders.markDone(id);
    if (!updated) throw new NotFoundError('Reminder');

    await this.audit.record(context, {
      action: 'انجام یادآور',
      entity: 'reminder',
      entityId: id,
      entityLabel: updated.userName,
      detail: updated.title,
    });

    return updated;
  }

  async delete(id: string, context: AuditContext): Promise<void> {
    const reminder = await this.reminders.findById(id);
    if (!reminder) throw new NotFoundError('Reminder');

    await this.reminders.delete(id);
    await this.audit.record(context, {
      action: 'حذف یادآور',
      entity: 'reminder',
      entityId: id,
      entityLabel: reminder.userName,
      detail: reminder.title,
    });
  }
}
