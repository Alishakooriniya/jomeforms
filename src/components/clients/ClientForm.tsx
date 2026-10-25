/* فرم پرونده — فقط نام و نام خانوادگی اجباری است. اطلاعات تکمیلی در
   صفحه ثبت (alwaysShowExtra) به‌صورت ثابت دیده می‌شود و در پنجره‌های
   ویرایش زیر یک تاشو قرار می‌گیرد تا آن فرم‌ها فشرده بمانند. */

import { useState } from 'react';
import type { Client } from '../../types';
import { isAlphabeticName, isValidMobile, isValidNationalId } from '../../lib/crypto';
import { cn, onlyDigits, toLatinDigits } from '../../lib/utils';
import { isValidJalaliDate, normalizeJalaliDate } from '../../lib/jalali';
import { Button } from '../ui/Button';
import { FormActions, FormGrid } from '../ui/Controls';
import { TextInput, Textarea } from '../ui/Field';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { Icon } from '../ui/Icon';
import type { ClientDraft } from '../../store/DataProvider';

export function emptyClientDraft(): ClientDraft {
  return {
    fullName: '',
    nationalId: '',
    mobile: '',
    birthCertificateNumber: '',
    fatherName: '',
    issuePlace: '',
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
  /** وقتی فعال باشد، اطلاعات تکمیلی بدون تاشو همیشه دیده می‌شود */
  alwaysShowExtra?: boolean;
}

export function ClientForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = 'ذخیره پرونده',
  alwaysShowExtra = false,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientDraft>(initial ?? emptyClientDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showExtra, setShowExtra] = useState(() => {
    const source = initial ?? emptyClientDraft();
    return Boolean(
      source.birthCertificateNumber ||
        source.fatherName ||
        source.issuePlace ||
        source.birthDate ||
        source.residenceAddress,
    );
  });

  const set = <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'نام و نام خانوادگی الزامی است.';
    else if (form.fullName.trim().length < 2) nextErrors.fullName = 'نام و نام خانوادگی حداقل ۲ حرف است.';
    else if (!isAlphabeticName(form.fullName)) nextErrors.fullName = 'نام و نام خانوادگی باید فقط شامل حروف باشد.';
    if (form.mobile && !isValidMobile(form.mobile)) nextErrors.mobile = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.';
    if (form.nationalId && !isValidNationalId(form.nationalId)) {
      nextErrors.nationalId = 'کد ملی معتبر نیست (الگوریتم کنترل).';
    }
    if (
      form.birthCertificateNumber?.trim() &&
      !/^\d{1,10}$/.test(toLatinDigits(form.birthCertificateNumber.trim()))
    ) {
      nextErrors.birthCertificateNumber = 'شماره شناسنامه باید حداکثر ۱۰ رقم باشد.';
    }
    if (form.fatherName?.trim() && !isAlphabeticName(form.fatherName)) {
      nextErrors.fatherName = 'نام پدر باید فقط شامل حروف باشد.';
    }
    if (form.issuePlace?.trim() && !isAlphabeticName(form.issuePlace)) {
      nextErrors.issuePlace = 'شهر صادره باید فقط شامل حروف باشد.';
    }
    if (form.birthDate && !isValidJalaliDate(form.birthDate)) {
      nextErrors.birthDate = 'تاریخ تولد باید شمسی و به‌شکل ۱۴۰۵/۰۷/۳۰ باشد.';
    }
    if ((form.residenceAddress?.trim().length ?? 0) > 500) {
      nextErrors.residenceAddress = 'نشانی حداکثر ۵۰۰ کاراکتر است.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (Object.keys(nextErrors).some((key) => ['birthCertificateNumber', 'fatherName', 'issuePlace', 'birthDate'].includes(key))) {
        setShowExtra(true);
      }
      return;
    }

    onSubmit({
      ...form,
      fullName: form.fullName.trim(),
      nationalId: onlyDigits(form.nationalId),
      mobile: onlyDigits(form.mobile),
      birthCertificateNumber: onlyDigits(form.birthCertificateNumber ?? ''),
      fatherName: form.fatherName?.trim() ?? '',
      issuePlace: form.issuePlace?.trim() ?? '',
      birthDate: form.birthDate ? normalizeJalaliDate(form.birthDate) ?? '' : '',
      residenceAddress: form.residenceAddress?.trim() ?? '',
    });
  };

  const extraFields = (
    <>
      <TextInput
        label="شماره شناسنامه"
        value={form.birthCertificateNumber ?? ''}
        inputMode="numeric"
        maxLength={10}
        error={errors.birthCertificateNumber}
        onChange={(event) => set('birthCertificateNumber', onlyDigits(event.target.value))}
      />
      <TextInput
        label="نام پدر"
        value={form.fatherName ?? ''}
        maxLength={120}
        error={errors.fatherName}
        onChange={(event) => set('fatherName', event.target.value)}
      />
      <TextInput
        label="شهر صادره شناسنامه"
        value={form.issuePlace ?? ''}
        maxLength={120}
        error={errors.issuePlace}
        onChange={(event) => set('issuePlace', event.target.value)}
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
        maxLength={500}
        error={errors.residenceAddress}
        value={form.residenceAddress ?? ''}
        onChange={(event) => set('residenceAddress', event.target.value)}
      />
    </>
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <FormGrid columns={2}>
        <TextInput
          label="نام و نام خانوادگی"
          required
          value={form.fullName}
          maxLength={160}
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
          maxLength={11}
          error={errors.mobile}
          onChange={(event) => set('mobile', onlyDigits(event.target.value))}
        />
        {alwaysShowExtra ? extraFields : null}
      </FormGrid>

      {!alwaysShowExtra ? (
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowExtra((prev) => !prev)}
            aria-expanded={showExtra}
            className="flex w-full items-center gap-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <Icon name="chevron-down" size={12} className={cn('transition-transform', !showExtra && 'rotate-90')} />
            اطلاعات تکمیلی
            <span className="font-normal text-fg-subtle">(اختیاری — شناسنامه، تولد و نشانی)</span>
            {!showExtra ? <span className="ms-auto text-[10.5px] font-normal text-fg-subtle">باز کردن</span> : null}
          </button>

          {showExtra ? (
            <FormGrid columns={2} className="mt-3">
              {extraFields}
            </FormGrid>
          ) : null}
        </div>
      ) : null}

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
