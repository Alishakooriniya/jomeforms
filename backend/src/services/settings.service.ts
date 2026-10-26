import type { SettingsRepository } from '../repositories/settings.repository.js';
import type { AppSettings } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<AppSettings> {
    return this.settings.get();
  }

  async update(patch: Partial<AppSettings>, context: AuditContext): Promise<AppSettings> {
    const updated = await this.settings.update(patch);

    await this.audit.record(context, {
      action: 'تغییر تنظیمات',
      entity: 'settings',
      entityId: 'app_settings',
      entityLabel: 'تنظیمات سامانه',
      detail: Object.keys(patch).length ? Object.keys(patch).join(', ') : undefined,
    });

    return updated;
  }
}
