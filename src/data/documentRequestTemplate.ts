import type { FormTemplate, TemplateField } from '../types';

const createdAt = new Date().toISOString();

function field(key: string, label: string, type: TemplateField['type'] = 'text', extra: Partial<TemplateField> = {}): TemplateField {
  return { id: `document-request-${key}`, key, label, type, required: true, ...extra };
}

export const DOCUMENT_REQUEST_TEMPLATE: FormTemplate = {
  id: 'tpl-document-request',
  title: 'فرم تقاضای صدور سند',
  category: 'other',
  printLayout: 'document-request-a4',
  description: 'فرم A4 تقاضای صدور سند با چیدمان ثابت و متن قابل‌ویرایش',
  requiresSignature: true,
  active: true,
  version: 1,
  createdAt,
  updatedAt: createdAt,
  createdBy: 'system',
  fields: [
    field('request_date', 'تاریخ تقاضا', 'date'),
    field('applicant_name', 'نام و نام خانوادگی متقاضی', 'text', {
      source: 'fullName',
      group: 'متقاضی',
    }),
    field('father_name', 'نام پدر', 'text', { source: 'fatherName', group: 'متقاضی' }),
    field('birth_certificate_number', 'شماره شناسنامه', 'text', {
      source: 'birthCertificateNumber',
      group: 'متقاضی',
    }),
    field('national_id', 'کد ملی', 'nationalId', { source: 'nationalId', group: 'متقاضی' }),
    field('issue_place', 'شهر صادره شناسنامه', 'text', { source: 'issuePlace', group: 'متقاضی' }),
    field('residence_address', 'نشانی محل سکونت', 'textarea', { group: 'تماس' }),
    field('contact_phone', 'تلفن تماس', 'mobile', { source: 'mobile', group: 'تماس' }),
    field('occupancy_start_date', 'تاریخ شروع تصرف', 'date', { group: 'زمین' }),
    field('land_parcel', 'پلاک مورد تقاضا', 'select', {
      options: ['پلاک ثبتی یک اصلی', 'پلاک ۱۲۴۶ اصلی'],
      group: 'زمین',
    }),
    field('land_area', 'مساحت زمین', 'number', { suffix: 'متر مربع', group: 'زمین' }),
  ],
  body: `بسمه تعالی

تقاضای صدور سند

تولیت محترم موقوفات عام‌المنفعه امام جمعه
سلام علیکم

احتراماً نظر به اینکه اینجانب {{applicant_name}} فرزند {{father_name}} شماره شناسنامه
{{birth_certificate_number}} دارای کد ملی {{national_id}} صادره از {{issue_place}} ساکن
{{residence_address}} تلفن {{contact_phone}} از تاریخ {{occupancy_start_date}} متصرف یک قطعه زمین
از اراضی مزرعه هاشم‌آباد، {{land_parcel}} واقع در بخش هفت تهران به مساحت {{land_area}}
متر مربع می‌باشم و شرح تقاضانامه و قولنامه پیوست است.

مستدعی است نسبت به عقد قرارداد با اینجانب وفق ضوابط و مقررات اوقاف اقدام مبذول فرمایید.

نام و نام خانوادگی: {{applicant_name}}
کد ملی: {{national_id}}
امضاء`,
};
