import type { Request, Response } from 'express';
import type { BackupService } from '../services/backup.service.js';
import { sendSuccess } from '../utils/response.js';
import { auditContext, body } from './context.js';

export class BackupController {
  constructor(private readonly backup: BackupService) {}

  export = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.backup.export());
  };

  import = async (req: Request, res: Response): Promise<void> => {
    const result = await this.backup.import(body<unknown>(req), auditContext(req));
    sendSuccess(res, result, { message: 'Backup restored.' });
  };
}
