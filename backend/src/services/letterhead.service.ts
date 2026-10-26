import type {
  LetterheadPrintFilters,
  LetterheadRepository,
} from '../repositories/letterhead.repository.js';
import type { LetterheadConfig, LetterheadPrint, LetterheadPaper, LetterheadPrintKind } from '../types/domain.js';
import type { AuditContext, AuditService } from './audit.service.js';

export interface LetterheadPrintInput {
  paper: LetterheadPaper;
  kind: LetterheadPrintKind;
  values?: Record<string, string>;
}

export class LetterheadService {
  constructor(
    private readonly letterhead: LetterheadRepository,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<LetterheadConfig> {
    return this.letterhead.getConfig();
  }

  async update(patch: Partial<LetterheadConfig>, context: AuditContext): Promise<LetterheadConfig> {
    const updated = await this.letterhead.updateAddress(patch.address?.trim() || null);

    await this.audit.record(context, {
      action: 'ویرایش سربرگ',
      entity: 'letterhead',
      entityId: 'app_settings',
      entityLabel: 'نشانی سربرگ',
      detail: patch.address?.trim() ? 'نشانی کادر پایین تغییر کرد' : 'نشانی به پیش‌فرض برگشت',
    });

    return updated;
  }

  async listPrints(filters: LetterheadPrintFilters): Promise<{ items: LetterheadPrint[]; total: number }> {
    return this.letterhead.listPrints(filters);
  }

  /** هر نسخه چاپ‌شده ثبت می‌شود — هم در جدول پیگیری هم در گزارش فعالیت */
  async recordPrint(input: LetterheadPrintInput, context: AuditContext): Promise<LetterheadPrint> {
    const values = input.kind === 'blank' ? {} : (input.values ?? {});
    const created = await this.letterhead.createPrint({
      paper: input.paper,
      kind: input.kind,
      values,
      userId: context.actor.id,
      userName: context.actor.name,
    });

    const number = typeof values.number === 'string' && values.number.trim() ? ` — شماره ${values.number}` : '';
    await this.audit.record(context, {
      action: 'چاپ سربرگ',
      entity: 'letterhead',
      entityId: created.id,
      entityLabel: `سربرگ ${input.paper}`,
      detail: `${input.kind === 'blank' ? 'خالی' : 'تکمیل‌شده'}${number}`,
    });

    return created;
  }
}
