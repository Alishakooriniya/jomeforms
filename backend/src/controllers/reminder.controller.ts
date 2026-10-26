import type { Request, Response } from 'express';
import { hasPermission } from '../middleware/index.js';
import type { ReminderFilters } from '../repositories/reminder.repository.js';
import type { ReminderInput, ReminderService } from '../services/reminder.service.js';
import { toListOptions } from '../utils/pagination.js';
import type { ListQuery } from '../utils/pagination.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/response.js';
import { auditContext, body, listQuery, params } from './context.js';

interface ReminderListQuery extends ListQuery {
  userId?: string;
  done?: boolean;
}

export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listQuery<ReminderListQuery>(req);
    // Without reminders.manage, a user only ever sees their own reminders.
    const canManage = hasPermission(req.user!, 'reminders.manage');
    const filters: ReminderFilters = {
      ...toListOptions(query),
      userId: canManage ? query.userId : req.user!.id,
      done: query.done,
    };
    const result = await this.reminders.list(filters);
    sendPaginated(res, result, query.page, query.limit);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const created = await this.reminders.create(body<ReminderInput>(req), auditContext(req));
    sendSuccess(res, created, { status: 201, message: 'Reminder created.' });
  };

  markDone = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    const canManage = hasPermission(req.user!, 'reminders.manage');
    const updated = await this.reminders.markDone(id, req.user!.id, canManage, auditContext(req));
    sendSuccess(res, updated, { message: 'Reminder completed.' });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = params<{ id: string }>(req);
    await this.reminders.delete(id, auditContext(req));
    sendNoContent(res);
  };
}
