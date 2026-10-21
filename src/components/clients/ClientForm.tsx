/* فرم پرونده با تمرکز بر اطلاعات هویتی متقاضی */

import { useState } from 'react';
import type { Client } from '../../types';
import { isValidMobile, isValidNationalId } from '../../lib/crypto';
import { onlyDigits } from '../../lib/utils';
import { isValidJalaliDate, normalizeJalaliDate } from '../../lib/jalali';
import { Button } from '../ui/Button';
import { FormActions, FormGrid } from '../ui/Controls';
import { TextInput, Textarea } from '../ui/Field';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import type { ClientDraft } from '../../store/DataProvider';

export function emptyClientDraft(): ClientDraft {
  return {
    fullName: '',
    nationalId: '',
    mobile: '',
    phone: '',
    fatherName: '',
    birthDate: '',
    residenceAddress: '',
  };
}

export function clientToDraft(client: Client): ClientDraft {
  const { id: _id, code, createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...rest } = client;
  return { ...rest, code };
}

export interface ClientFormProps {
  initial?: ClientDraft;
  onSubmit: (draft: ClientDraft) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card-2/40 p-3.5">
      <h3 className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-fg">
        <span className="h-3.5 w-1 rounded-full bg-brand-500" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ClientForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = 'ذخیره پرونده',
}: ClientFormProps) {
  const [form, setForm] = useState<ClientDraft>(initial ?? emptyClientDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'نام و نام خانوادگی الزامی است.';
    if (form.mobile && !isValidMobile(form.mobile)) nextErrors.mobile = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.';
    if (form.nationalId && !isValidNationalId(form.nationalId)) {
      nextErrors.nationalId = 'کد ملی معتبر نیست (الگوریتم کنترل).';
    }
    if (form.birthDate && !isValidJalaliDate(form.birthDate)) {
      nextErrors.birthDate = 'تاریخ تولد باید شمسی و به‌شکل ۱۴۰۵/۰۷/۳۰ باشد.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      ...form,
      fullName: form.fullName.trim(),
      nationalId: onlyDigits(form.nationalId),
      mobile: onlyDigits(form.mobile),
      birthDate: form.birthDate ? normalizeJalaliDate(form.birthDate) ?? '' : '',
      residenceAddress: form.residenceAddress?.trim() ?? '',
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Section title="اطلاعات هویتی">
        <FormGrid columns={2}>
          <TextInput
            label="نام و نام خانوادگی"
            required
            value={form.fullName}
            error={errors.fullName}
            onChange={(event) => set('fullName', event.target.value)}
          />
          <TextInput
            label="کد ملی"
            value={form.nationalId}
            inputMode="numeric"
            maxLength={10}
            error={errors.nationalId}
            onChange={(event) => set('nationalId', onlyDigits(event.target.value))}
          />
          <TextInput
            label="موبایل"
            value={form.mobile}
            inputMode="tel"
            error={errors.mobile}
            onChange={(event) => set('mobile', onlyDigits(event.target.value))}
          />
          <TextInput
            label="تلفن ثابت"
            value={form.phone ?? ''}
            onChange={(event) => set('phone', event.target.value)}
          />
          <TextInput
            label="نام پدر"
            value={form.fatherName ?? ''}
            onChange={(event) => set('fatherName', event.target.value)}
          />
          <JalaliDatePicker
            label="تاریخ تولد"
            value={form.birthDate ?? ''}
            error={errors.birthDate}
            onChange={(value) => set('birthDate', value)}
          />
          <Textarea
            label="نشانی محل سکونت"
            className="min-h-20"
            containerClassName="md:col-span-2"
            value={form.residenceAddress ?? ''}
            onChange={(event) => set('residenceAddress', event.target.value)}
          />
        </FormGrid>
      </Section>

      <FormActions>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          انصراف
        </Button>
        <Button type="submit" variant="primary" icon="save" loading={submitting}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}
