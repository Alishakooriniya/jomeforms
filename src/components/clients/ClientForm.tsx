/* فرم پرونده — همان اطلاعاتی که بعداً به‌صورت خودکار در فرم‌ها جای‌گذاری می‌شود */

import { useState } from 'react';
import type { AppSettings, Client, ClientStatus, DealKind, PartyRole, PropertyKind } from '../../types';
import { isValidMobile, isValidNationalId } from '../../lib/crypto';
import { onlyDigits } from '../../lib/utils';
import {
  CLIENT_STATUS_OPTIONS,
  DEAL_KIND_OPTIONS,
  PARTY_ROLE_OPTIONS,
  PROPERTY_KIND_OPTIONS,
} from '../../data/labels';
import { Button } from '../ui/Button';
import { CurrencyInput, FormActions, FormGrid, NumberInput } from '../ui/Controls';
import { Select, TextInput, Textarea } from '../ui/Field';
import type { ClientDraft } from '../../store/DataProvider';

export function emptyClientDraft(settings: AppSettings): ClientDraft {
  return {
    fullName: '',
    nationalId: '',
    mobile: '',
    phone: '',
    email: '',
    fatherName: '',
    birthDate: '',
    partyRole: 'buyer',
    party2Name: '',
    party2Role: 'seller',
    party2NationalId: '',
    party2Mobile: '',
    dealKind: 'sale',
    status: 'new',
    province: settings.defaultProvince,
    city: settings.defaultCity,
    address: '',
    propertyKind: 'apartment',
    area: 0,
    region: '',
    plate: '',
    unit: '',
    floor: '',
    buildYear: '',
    price: 0,
    deposit: 0,
    rent: 0,
    commissionPercent: 0.5,
    agentName: '',
    source: '',
    tags: [],
    notes: '',
    extra: {},
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

export function ClientForm({ initial, onSubmit, onCancel, submitting, submitLabel = 'ذخیره پرونده' }: ClientFormProps) {
  const [form, setForm] = useState<ClientDraft>(initial ?? ({} as ClientDraft));
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join('، '));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const numberValue = (value: string) => Number(onlyDigits(value) || 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'نام و نام خانوادگی الزامی است.';
    if (form.mobile && !isValidMobile(form.mobile)) nextErrors.mobile = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.';
    if (form.party2Mobile && !isValidMobile(form.party2Mobile)) nextErrors.party2Mobile = 'شماره طرف دوم معتبر نیست.';
    if (form.nationalId && !isValidNationalId(form.nationalId)) nextErrors.nationalId = 'کد ملی معتبر نیست (الگوریتم کنترل).';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      ...form,
      fullName: form.fullName.trim(),
      nationalId: onlyDigits(form.nationalId),
      mobile: onlyDigits(form.mobile),
      party2NationalId: onlyDigits(form.party2NationalId ?? ''),
      party2Mobile: onlyDigits(form.party2Mobile ?? ''),
      tags: tagsText
        .split(/[،,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Section title="اطلاعات هویتی" hint="این اطلاعات در همه فرم‌ها جای‌گذاری می‌شود">
        <FormGrid columns={3}>
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
          <TextInput label="تلفن ثابت" value={form.phone ?? ''} onChange={(event) => set('phone', event.target.value)} />
          <TextInput
            label="نام پدر"
            value={form.fatherName ?? ''}
            onChange={(event) => set('fatherName', event.target.value)}
          />
          <TextInput
            label="تاریخ تولد"
            type="date"
            value={form.birthDate ?? ''}
            onChange={(event) => set('birthDate', event.target.value)}
          />
          <Select
            label="نقش در معامله"
            value={form.partyRole}
            options={PARTY_ROLE_OPTIONS}
            onChange={(event) => set('partyRole', event.target.value as PartyRole)}
          />
          <TextInput
            label="ایمیل"
            type="email"
            dir="ltr"
            value={form.email ?? ''}
            onChange={(event) => set('email', event.target.value)}
          />
          <TextInput
            label="شماره پرونده"
            value={form.code ?? ''}
            hint="خالی بگذارید تا خودکار تولید شود"
            onChange={(event) => set('code', event.target.value)}
          />
        </FormGrid>
      </Section>

      <Section title="طرف دوم معامله" hint="خریدار/فروشنده مقابل">
        <FormGrid columns={2}>
          <TextInput
            label="نام طرف دوم"
            value={form.party2Name ?? ''}
            onChange={(event) => set('party2Name', event.target.value)}
          />
          <Select
            label="نقش طرف دوم"
            value={form.party2Role ?? 'seller'}
            options={PARTY_ROLE_OPTIONS}
            onChange={(event) => set('party2Role', event.target.value as PartyRole)}
          />
          <TextInput
            label="کد ملی طرف دوم"
            value={form.party2NationalId ?? ''}
            inputMode="numeric"
            maxLength={10}
            onChange={(event) => set('party2NationalId', onlyDigits(event.target.value))}
          />
          <TextInput
            label="موبایل طرف دوم"
            value={form.party2Mobile ?? ''}
            inputMode="tel"
            error={errors.party2Mobile}
            onChange={(event) => set('party2Mobile', onlyDigits(event.target.value))}
          />
        </FormGrid>
      </Section>

      <Section title="مشخصات ملک">
        <FormGrid columns={3}>
          <TextInput label="استان" value={form.province} onChange={(event) => set('province', event.target.value)} />
          <TextInput label="شهر" value={form.city} onChange={(event) => set('city', event.target.value)} />
          <TextInput label="محله / منطقه" value={form.region ?? ''} onChange={(event) => set('region', event.target.value)} />
          <Select
            label="نوع ملک"
            value={form.propertyKind}
            options={PROPERTY_KIND_OPTIONS}
            onChange={(event) => set('propertyKind', event.target.value as PropertyKind)}
          />
          <NumberInput
            label="متراژ"
            suffix="متر"
            value={form.area ? String(form.area) : ''}
            onChange={(value) => set('area', numberValue(value))}
          />
          <TextInput label="سال ساخت" value={form.buildYear ?? ''} onChange={(event) => set('buildYear', event.target.value)} />
          <TextInput label="پلاک ثبتی" value={form.plate ?? ''} onChange={(event) => set('plate', event.target.value)} />
          <TextInput label="واحد" value={form.unit ?? ''} onChange={(event) => set('unit', event.target.value)} />
          <TextInput label="طبقه" value={form.floor ?? ''} onChange={(event) => set('floor', event.target.value)} />
          <Textarea
            label="نشانی کامل ملک"
            className="min-h-20"
            containerClassName="md:col-span-3"
            value={form.address}
            onChange={(event) => set('address', event.target.value)}
          />
        </FormGrid>
      </Section>

      <Section title="اطلاعات مالی">
        <FormGrid columns={3}>
          <Select
            label="نوع معامله"
            value={form.dealKind}
            options={DEAL_KIND_OPTIONS}
            onChange={(event) => set('dealKind', event.target.value as DealKind)}
          />
          <CurrencyInput
            label="قیمت کل"
            value={form.price ? String(form.price) : ''}
            onChange={(value) => set('price', numberValue(value))}
          />
          <CurrencyInput
            label="ودیعه / علی‌الحساب"
            value={form.deposit ? String(form.deposit) : ''}
            onChange={(value) => set('deposit', numberValue(value))}
          />
          <CurrencyInput
            label="اجاره ماهانه"
            value={form.rent ? String(form.rent) : ''}
            onChange={(value) => set('rent', numberValue(value))}
          />
          <NumberInput
            label="درصد کمیسیون"
            suffix="٪"
            value={form.commissionPercent ? String(form.commissionPercent) : ''}
            onChange={(value) => set('commissionPercent', Number(value || 0))}
          />
          <TextInput
            label="کارشناس / مشاور"
            value={form.agentName ?? ''}
            onChange={(event) => set('agentName', event.target.value)}
          />
        </FormGrid>
      </Section>

      <Section title="وضعیت و یادداشت">
        <FormGrid columns={3}>
          <Select
            label="وضعیت پرونده"
            value={form.status}
            options={CLIENT_STATUS_OPTIONS}
            onChange={(event) => set('status', event.target.value as ClientStatus)}
          />
          <TextInput
            label="منبع آشنایی"
            value={form.source ?? ''}
            placeholder="مثال: تماس تلفنی، دیوار، معرفی"
            onChange={(event) => set('source', event.target.value)}
          />
          <TextInput
            label="برچسب‌ها"
            value={tagsText}
            hint="با ویرگول جدا کنید"
            onChange={(event) => setTagsText(event.target.value)}
          />
          <Textarea
            label="یادداشت"
            className="min-h-20"
            containerClassName="md:col-span-3"
            value={form.notes ?? ''}
            onChange={(event) => set('notes', event.target.value)}
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
