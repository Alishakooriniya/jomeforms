import type { Request, Response } from 'express';
import type { AppSettings } from '../types/domain.js';
import type { SettingsService } from '../services/settings.service.js';
import { sendSuccess } from '../utils/response.js';
import { auditContext, body } from './context.js';

export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.settings.get());
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const updated = await this.settings.update(body<Partial<AppSettings>>(req), auditContext(req));
    sendSuccess(res, updated, { message: 'Settings updated.' });
  };
}
