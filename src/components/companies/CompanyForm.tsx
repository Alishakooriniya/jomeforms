/* فرم مجموعه (شرکت/مالک زمین) — در پنجره گفت‌وگو استفاده می‌شود */

import { useState } from 'react';
import type { Company, CompanyKind } from '../../types';
import { COMPANY_KIND_OPTIONS } from '../../data/labels';
import { onlyDigits } from '../../lib/utils';
import type { CompanyDraft } from '../../store/DataProvider';
import { Button } from '../ui/Button';
import { FormActions, FormGrid, NumberInput, Switch } from '../ui/Controls';
import { Select, TextInput, Textarea } from '../ui/Field';

export function emptyCompanyDraft(): CompanyDraft {
  return {
    name: '',
    kind: 'owner',
    nationalId: '',
    managerName: '',
    mobile: '',
    phone: '',
    address: '',
    plotCount: 0,
    totalArea: 0,
    note: '',
    active: true,
  };
}

export function companyToDraft(company: Company): CompanyDraft {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...rest } = company;
  return rest;
}

export interface CompanyFormProps {
  initial?: CompanyDraft;
  onSubmit: (draft: CompanyDraft) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card-2/40 p-3.5">
      <h3 className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-fg">
        <span className="h-3.5 w-1 rounded-full bg-brand-500" />
        {title}
        {hint ? <span className="text-[10.5px] font-normal text-fg-subtle">{hint}</span> : null}
      </h3>
      {children}
    </section>
  );
}

export function CompanyForm({ initial, onSubmit, onCancel, submitting, submitLabel = 'ذخیره مجموعه' }: CompanyFormProps) {
  const [form, setForm] = useState<CompanyDraft>(initial ?? emptyCompanyDraft());

  const set = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const numberValue = (value: string) => (value ? Number(onlyDigits(value)) : 0);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...form, name: form.name.trim() });
      }}
    >
      <Section title="مشخصات مجموعه">
        <FormGrid columns={2}>
          <TextInput
            label="نام مجموعه"
            required
            containerClassName="md:col-span-2"
            value={form.name}
            placeholder="مثال: شرکت عمران دشت‌پردیس"
            onChange={(event) => set('name', event.target.value)}
          />
          <Select
            label="نوع مجموعه"
            value={form.kind}
            options={COMPANY_KIND_OPTIONS}
            onChange={(event) => set('kind', event.target.value as CompanyKind)}
          />
          <TextInput
            label="شناسه ملی / شماره ثبت"
            dir="ltr"
            value={form.nationalId ?? ''}
            onChange={(event) => set('nationalId', onlyDigits(event.target.value))}
          />
          <TextInput
            label="رابط یا مدیر مجموعه"
            value={form.managerName ?? ''}
            placeholder="نام و نام خانوادگی"
            onChange={(event) => set('managerName', event.target.value)}
          />
          <TextInput
            label="موبایل رابط"
            dir="ltr"
            value={form.mobile ?? ''}
            onChange={(event) => set('mobile', onlyDigits(event.target.value))}
          />
          <TextInput
            label="تلفن ثابت"
            dir="ltr"
            value={form.phone ?? ''}
            onChange={(event) => set('phone', event.target.value)}
          />
          <div className="flex items-end">
            <Switch
              checked={form.active}
              label="مجموعه فعال است"
              hint="مجموعه غیرفعال در فهرست‌ها کم‌رنگ نشان داده می‌شود"
              onChange={(checked) => set('active', checked)}
              id="company-active"
            />
          </div>
        </FormGrid>
      </Section>

      <Section title="زمین و نشانی" hint="اختیاری">
        <FormGrid columns={2}>
          <NumberInput
            label="تعداد قطعه‌زمین"
            suffix="قطعه"
            value={form.plotCount ? String(form.plotCount) : ''}
            onChange={(value) => set('plotCount', numberValue(value))}
          />
          <NumberInput
            label="متراژ کل"
            suffix="متر"
            value={form.totalArea ? String(form.totalArea) : ''}
            onChange={(value) => set('totalArea', numberValue(value))}
          />
          <Textarea
            label="نشانی دفتر مجموعه"
            className="min-h-20"
            containerClassName="md:col-span-2"
            value={form.address ?? ''}
            onChange={(event) => set('address', event.target.value)}
          />
          <Textarea
            label="یادداشت داخلی"
            className="min-h-20"
            containerClassName="md:col-span-2"
            value={form.note ?? ''}
            onChange={(event) => set('note', event.target.value)}
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
