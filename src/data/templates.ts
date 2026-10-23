/* قالب‌های نمونه فرم‌های املاک.
   هر قالب = فهرست فیلدها + متن قرارداد با نشانه‌های {{key}}.
   سوپرادمین می‌تواند همین ساختار را از داخل برنامه بسازد؛ فرم‌های واقعی
   شما هم به همین شکل یکی‌یکی اضافه می‌شوند. */

import type { FieldType, FormTemplate, TemplateField } from '../types';

let fieldCounter = 0;

function field(key: string, label: string, type: FieldType = 'text', extra: Partial<TemplateField> = {}): TemplateField {
  fieldCounter += 1;
  return { id: `tf${fieldCounter}`, key, label, type, required: false, ...extra };
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const SEED_TEMPLATES: FormTemplate[] = [
  {
    id: 'tpl-document-request',
    title: 'فرم تقاضای صدور سند',
    category: 'other',
    printLayout: 'document-request-a4',
    description: 'فرم A4 تقاضای صدور سند با چیدمان ثابت و متن قابل‌ویرایش',
    requiresSignature: true,
    active: true,
    version: 1,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    createdBy: 'system',
    fields: [
      field('request_date', 'تاریخ تقاضا', 'date', { required: true }),
      field('applicant_name', 'نام و نام خانوادگی متقاضی', 'text', {
        source: 'fullName',
        required: true,
        group: 'متقاضی',
      }),
      field('father_name', 'نام پدر', 'text', { source: 'fatherName', required: true, group: 'متقاضی' }),
      field('birth_certificate_number', 'شماره شناسنامه', 'text', {
        source: 'birthCertificateNumber',
        required: true,
        group: 'متقاضی',
      }),
      field('national_id', 'کد ملی', 'nationalId', {
        source: 'nationalId',
        required: true,
        group: 'متقاضی',
      }),
      field('issue_place', 'شهر صادره شناسنامه', 'text', {
        source: 'issuePlace',
        required: true,
        group: 'متقاضی',
      }),
      field('residence_address', 'نشانی محل سکونت', 'textarea', { required: true, group: 'تماس' }),
      field('contact_phone', 'تلفن تماس', 'mobile', { source: 'mobile', required: true, group: 'تماس' }),
      field('occupancy_start_date', 'تاریخ شروع تصرف', 'date', { required: true, group: 'زمین' }),
      field('land_parcel', 'پلاک مورد تقاضا', 'select', {
        options: ['پلاک ثبتی یک اصلی', 'پلاک ۱۲۴۶ اصلی'],
        required: true,
        group: 'زمین',
      }),
      field('land_area', 'مساحت زمین', 'number', { required: true, suffix: 'متر مربع', group: 'زمین' }),
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
  },
  {
    id: 'tpl-sale',
    title: 'مبایعه‌نامه ملک مسکونی',
    category: 'sale',
    description: 'قرارداد خرید و فروش آپارتمان یا خانه بین فروشنده و خریدار',
    requiresSignature: true,
    active: true,
    version: 3,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(14),
    createdBy: 'system',
    headerNote:
      'طرفین با آگاهی کامل از مفاد این قرارداد و با رعایت ماده ۱۰ قانون مدنی، بدان متعهد و ملتزم شدند.',
    footerNote:
      'این قرارداد در دو نسخه با اعتبار یکسان تنظیم شد و هر یک از طرفین یک نسخه را دریافت کرد.',
    fields: [
      field('doc_city', 'شهر تنظیم سند', 'text', { source: 'city', required: true }),
      field('doc_date', 'تاریخ تنظیم سند', 'date', { required: true, help: 'تاریخ شمسی نمایش داده می‌شود' }),
      field('seller_name', 'نام فروشنده', 'text', { source: 'fullName', required: true, group: 'فروشنده' }),
      field('seller_father', 'نام پدر فروشنده', 'text', { group: 'فروشنده' }),
      field('seller_national_id', 'کد ملی فروشنده', 'nationalId', { source: 'nationalId', required: true, group: 'فروشنده' }),
      field('seller_mobile', 'موبایل فروشنده', 'mobile', { source: 'mobile', group: 'فروشنده' }),
      field('buyer_name', 'نام خریدار', 'text', { source: 'party2Name', required: true, group: 'خریدار' }),
      field('buyer_national_id', 'کد ملی خریدار', 'nationalId', { source: 'party2NationalId', group: 'خریدار' }),
      field('buyer_mobile', 'موبایل خریدار', 'mobile', { source: 'party2Mobile', group: 'خریدار' }),
      field('property_address', 'نشانی ملک', 'textarea', { source: 'address', required: true, group: 'ملک' }),
      field('property_region', 'محله / منطقه', 'text', { source: 'region', group: 'ملک' }),
      field('property_plate', 'پلاک ثبتی', 'text', { source: 'plate', group: 'ملک' }),
      field('property_unit', 'واحد', 'text', { source: 'unit', group: 'ملک' }),
      field('property_floor', 'طبقه', 'text', { source: 'floor', group: 'ملک' }),
      field('property_area', 'مساحت', 'number', { source: 'area', suffix: 'متر', group: 'ملک' }),
      field('total_price', 'بهای کل', 'currency', { source: 'price', required: true, group: 'مالی' }),
      field('deposit_amount', 'مبلغ علی‌الحساب', 'currency', { source: 'deposit', group: 'مالی' }),
      field('payment_terms', 'شرح پرداخت اقساط', 'textarea', { group: 'مالی', placeholder: 'مثال: ۵۰۰ میلیون نقد، الباقی در دفترخانه' }),
      field('delivery_date', 'تاریخ تحویل', 'date', { group: 'تعیین‌ها' }),
      field('notary_office', 'دفتر اسناد رسمی', 'text', { group: 'تعیین‌ها' }),
      field('extra_terms', 'شرایط اضافی', 'textarea', { group: 'تعیین‌ها' }),
    ],
    body: `ماده ۱ — طرفین قرارداد
فروشنده: {{seller_name}} فرزند {{seller_father}} به شماره ملی {{seller_national_id}} و شماره تماس {{seller_mobile}}
خریدار: {{buyer_name}} به شماره ملی {{buyer_national_id}} و شماره تماس {{buyer_mobile}}

ماده ۲ — مورد معامله
یک باب ملک مسکونی واقع در {{property_address}}، محله {{property_region}}، پلاک ثبتی {{property_plate}}، واحد {{property_unit}} طبقه {{property_floor}} با مساحت {{property_area}}.

ماده ۳ — بهای معامله
بهای کل مورد معامله {{total_price}} می‌باشد که مبلغ {{deposit_amount}} آن به‌عنوان علی‌الحساب پرداخت و باقی به شرح زیر تسویه می‌گردد:
{{payment_terms}}

ماده ۴ — تحویل مورد معامله
تحویل ملک به خریدار حداکثر تا تاریخ {{delivery_date}} انجام می‌شود و از تاریخ تحویل، تمامی هزینه‌های جاری بر عهده خریدار است.

ماده ۵ — تنظیم سند رسمی
طرفین متعهدند در تاریخ مقرر در دفتر اسناد رسمی {{notary_office}} حاضر شده و سند انتقال را تنظیم کنند. عدم حضور هر طرف به‌منزله تخلف از قرارداد است.

ماده ۶ — شرایط و توضیحات مورد توافق
{{extra_terms}}

ماده ۷ — این قرارداد در شهر {{doc_city}} و به تاریخ {{doc_date}} تنظیم شده و امضای طرفین ذیل آن معتبر است.`,
  },
  {
    id: 'tpl-rent',
    title: 'اجاره‌نامه ملک مسکونی',
    category: 'rent',
    description: 'قرارداد اجاره واحد مسکونی بین موجر و مستأجر با ودیعه و اجاره ماهانه',
    requiresSignature: true,
    active: true,
    version: 2,
    createdAt: daysAgo(96),
    updatedAt: daysAgo(30),
    createdBy: 'system',
    headerNote: 'مدت اجاره و مبلغ آن با توافق طرفین به شرح زیر تعیین و امضا شد.',
    footerNote: 'پس از پایان مدت، تخلیه و تحویل ملک با تنظیم صورتجلسه انجام می‌شود.',
    fields: [
      field('doc_city', 'شهر تنظیم سند', 'text', { source: 'city', required: true }),
      field('doc_date', 'تاریخ تنظیم سند', 'date', { required: true }),
      field('landlord_name', 'نام موجر', 'text', { source: 'fullName', required: true, group: 'موجر' }),
      field('landlord_national_id', 'کد ملی موجر', 'nationalId', { source: 'nationalId', group: 'موجر' }),
      field('landlord_mobile', 'موبایل موجر', 'mobile', { source: 'mobile', group: 'موجر' }),
      field('tenant_name', 'نام مستأجر', 'text', { source: 'party2Name', required: true, group: 'مستأجر' }),
      field('tenant_national_id', 'کد ملی مستأجر', 'nationalId', { source: 'party2NationalId', group: 'مستأجر' }),
      field('tenant_mobile', 'موبایل مستأجر', 'mobile', { source: 'party2Mobile', group: 'مستأجر' }),
      field('property_address', 'نشانی ملک', 'textarea', { source: 'address', required: true, group: 'ملک' }),
      field('property_area', 'مساحت', 'number', { source: 'area', suffix: 'متر', group: 'ملک' }),
      field('property_unit', 'واحد', 'text', { source: 'unit', group: 'ملک' }),
      field('deposit_amount', 'مبلغ ودیعه (رهن)', 'currency', { source: 'deposit', required: true, group: 'مبلغ' }),
      field('rent_amount', 'اجاره ماهانه', 'currency', { source: 'rent', required: true, group: 'مبلغ' }),
      field('payment_day', 'روز پرداخت هر ماه', 'number', { defaultValue: '5', group: 'مبلغ' }),
      field('duration_months', 'مدت اجاره (ماه)', 'number', { defaultValue: '12', required: true, group: 'مدت' }),
      field('start_date', 'تاریخ شروع', 'date', { required: true, group: 'مدت' }),
      field('end_date', 'تاریخ پایان', 'date', { required: true, group: 'مدت' }),
      field('utilities_note', 'شرح قبوض و شارژ', 'textarea', { group: 'توافق‌ها', placeholder: 'قبوض آب، برق، گاز و شارژ بر عهده ...' }),
      field('pets_allowed', 'نگهداری حیوان خانگی مجاز است', 'checkbox', { group: 'توافق‌ها' }),
      field('extra_terms', 'شرایط اضافی', 'textarea', { group: 'توافق‌ها' }),
    ],
    body: `ماده ۱ — طرفین
موجر: {{landlord_name}} به شماره ملی {{landlord_national_id}} و تماس {{landlord_mobile}}
مستأجر: {{tenant_name}} به شماره ملی {{tenant_national_id}} و تماس {{tenant_mobile}}

ماده ۲ — مورد اجاره
ملک مسکونی واقع در {{property_address}} با مساحت {{property_area}}.

ماده ۳ — مدت اجاره
مدت اجاره {{duration_months}} ماه، از تاریخ {{start_date}} تا {{end_date}} می‌باشد.

ماده ۴ — ودیعه و اجاره‌بها
مبلغ ودیعه {{deposit_amount}} که پس از تخلیه و تسویه به مستأجر بازگردانده می‌شود و اجاره ماهانه {{rent_amount}} که تا روز {{payment_day}} هر ماه پرداخت می‌گردد.

ماده ۵ — قبوض و هزینه‌ها
{{utilities_note}}
نگهداری حیوان خانگی در ملک: {{pets_allowed}}

ماده ۶ — تعهدات مستأجر
مستأجر متعهد است از ملک برای سکونت استفاده کند، تغییرات سازه‌ای بدون اجازه کتبی موجر انجام ندهد و در پایان مدت ملک را در وضعیت اولیه تحویل دهد.

ماده ۷ — شرایط اضافی مورد توافق
{{extra_terms}}

ماده ۸ — این اجاره‌نامه در {{doc_city}} و به تاریخ {{doc_date}} با امضای طرفین معتبر است.`,
  },
  {
    id: 'tpl-commission',
    title: 'تعهدنامه پرداخت کمیسیون',
    category: 'commission',
    description: 'تعهد طرفین معامله به پرداخت کمیسیون مشاور املاک',
    requiresSignature: true,
    active: true,
    version: 1,
    createdAt: daysAgo(74),
    updatedAt: daysAgo(21),
    createdBy: 'system',
    headerNote: 'کمیسیون مطابق تعرفه اتحادیه مشاوران املاک و با توافق طرفین محاسبه شده است.',
    footerNote: 'در صورت انصراف از معامله پس از امضا، کمیسیون مطابق توافق قابل مطالبه است.',
    fields: [
      field('party_name', 'نام متعهد', 'text', { source: 'fullName', required: true }),
      field('party_national_id', 'کد ملی', 'nationalId', { source: 'nationalId', required: true }),
      field('party_mobile', 'موبایل', 'mobile', { source: 'mobile' }),
      field('deal_type', 'نوع معامله', 'select', {
        options: ['خرید', 'فروش', 'اجاره', 'رهن کامل'],
        required: true,
        defaultValue: 'خرید',
      }),
      field('property_address', 'نشانی ملک', 'textarea', { source: 'address', required: true }),
      field('property_code', 'شماره پرونده ملک', 'text', { source: 'code' }),
      field('deal_amount', 'مبلغ معامله', 'currency', { source: 'price' }),
      field('commission_percent', 'درصد کمیسیون', 'percent', { source: 'commissionPercent', defaultValue: '0.5' }),
      field('commission_amount', 'مبلغ کمیسیون', 'currency', { required: true }),
      field('due_date', 'مهلت پرداخت', 'date'),
      field('payment_method', 'روش پرداخت', 'select', {
        options: ['نقدی', 'کارت به کارت', 'چک', 'واریز به حساب'],
        defaultValue: 'نقدی',
      }),
      field('doc_city', 'شهر تنظیم سند', 'text', { source: 'city' }),
      field('doc_date', 'تاریخ تنظیم سند', 'date', { required: true }),
      field('extra_terms', 'توضیحات', 'textarea'),
    ],
    body: `اینجانب {{party_name}} فرزند ................ به شماره ملی {{party_national_id}} و شماره تماس {{party_mobile}} متعهد می‌شوم بابت خدمات مشاوره و معرفی ملک به نشانی {{property_address}} (پرونده شماره {{property_code}}) در معامله‌ای از نوع {{deal_type}} به مبلغ {{deal_amount}}، مبلغ {{commission_amount}} معادل {{commission_percent}} از ارزش معامله را به‌عنوان کمیسیون پرداخت نمایم.

مهلت پرداخت: {{due_date}}
روش پرداخت توافق‌شده: {{payment_method}}

توضیحات و شرایط دیگر:
{{extra_terms}}

این تعهدنامه در شهر {{doc_city}} و به تاریخ {{doc_date}} تنظیم و به امضای متعهد رسید.`,
  },
  {
    id: 'tpl-visit',
    title: 'فرم بازدید و معرفی ملک',
    category: 'visit',
    description: 'ثبت بازدید متقاضی از ملک و نتیجه بازدید',
    requiresSignature: true,
    active: true,
    version: 1,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(9),
    createdBy: 'system',
    headerNote: 'این فرم جهت ثبت سابقه بازدید و جلوگیری از معرفی مجدد ملک تنظیم می‌شود.',
    fields: [
      field('visit_date', 'تاریخ بازدید', 'date', { required: true }),
      field('visit_time', 'ساعت بازدید', 'text', { placeholder: 'مثال: ۱۶:۳۰' }),
      field('visitor_name', 'نام بازدیدکننده', 'text', { source: 'fullName', required: true }),
      field('visitor_national_id', 'کد ملی بازدیدکننده', 'nationalId', { source: 'nationalId' }),
      field('visitor_mobile', 'موبایل بازدیدکننده', 'mobile', { source: 'mobile', required: true }),
      field('property_code', 'کد ملک', 'text', { source: 'code' }),
      field('property_address', 'نشانی ملک', 'textarea', { source: 'address', required: true }),
      field('property_kind', 'نوع ملک', 'select', {
        options: ['آپارتمان', 'خانه ویلایی', 'ویلا', 'زمین', 'دفتر کار', 'مغازه', 'انبار'],
        defaultValue: 'آپارتمان',
      }),
      field('property_area', 'مساحت', 'number', { source: 'area', suffix: 'متر' }),
      field('listed_price', 'قیمت اعلامی', 'currency', { source: 'price' }),
      field('agent_name', 'کارشناس بازدید', 'text', { source: 'agentName' }),
      field('visit_result', 'نتیجه بازدید', 'select', {
        options: ['مورد پسند بود', 'مورد پسند نبود', 'نیاز به بازدید مجدد', 'در حال بررسی'],
        defaultValue: 'مورد پسند بود',
      }),
      field('visitor_note', 'یادداشت بازدیدکننده', 'textarea'),
    ],
    body: `فرم بازدید ملک

تاریخ بازدید: {{visit_date}} — ساعت: {{visit_time}}
بازدیدکننده: {{visitor_name}} به شماره ملی {{visitor_national_id}} و شماره تماس {{visitor_mobile}}

مشخصات ملک بازدیدشده
کد ملک: {{property_code}}
نشانی: {{property_address}}
نوع ملک: {{property_kind}} — مساحت: {{property_area}}
قیمت اعلامی: {{listed_price}}

کارشناس همراه: {{agent_name}}
نتیجه بازدید: {{visit_result}}

یادداشت بازدیدکننده:
{{visitor_note}}

بدین‌وسیله اینجانب {{visitor_name}} تأیید می‌کنم از ملک فوق بازدید کرده‌ام و در صورت انجام معامله با مالک یا واسطه دیگر، کمیسیون این مجموعه مطابق تعرفه قابل مطالبه است.`,
  },
  {
    id: 'tpl-presale',
    title: 'قرارداد پیش‌فروش واحد ساختمانی',
    category: 'presale',
    description: 'توافق پیش‌فروش یا مشارکت در ساخت با پرداخت مرحله‌ای',
    requiresSignature: true,
    active: true,
    version: 2,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(7),
    createdBy: 'system',
    headerNote: 'پرداخت‌ها بر اساس پیشرفت فیزیکی پروژه و طبق جدول توافق‌شده انجام می‌شود.',
    footerNote: 'تحویل واحد پس از اخذ پایان‌کار و با صورتجلسه تحویل انجام می‌گیرد.',
    fields: [
      field('doc_city', 'شهر تنظیم سند', 'text', { source: 'city', required: true }),
      field('doc_date', 'تاریخ تنظیم سند', 'date', { required: true }),
      field('builder_name', 'نام سازنده / فروشنده', 'text', { source: 'fullName', required: true, group: 'طرفین' }),
      field('builder_national_id', 'کد ملی سازنده', 'nationalId', { source: 'nationalId', group: 'طرفین' }),
      field('buyer_name', 'نام خریدار', 'text', { source: 'party2Name', required: true, group: 'طرفین' }),
      field('buyer_national_id', 'کد ملی خریدار', 'nationalId', { source: 'party2NationalId', group: 'طرفین' }),
      field('buyer_mobile', 'موبایل خریدار', 'mobile', { source: 'party2Mobile', group: 'طرفین' }),
      field('land_address', 'نشانی زمین پروژه', 'textarea', { source: 'address', required: true, group: 'پروژه' }),
      field('land_area', 'مساحت زمین', 'number', { source: 'area', suffix: 'متر', group: 'پروژه' }),
      field('total_units', 'تعداد کل واحدها', 'number', { group: 'پروژه' }),
      field('unit_no', 'شماره واحد مورد معامله', 'text', { source: 'unit', required: true, group: 'واحد' }),
      field('unit_floor', 'طبقه واحد', 'text', { source: 'floor', group: 'واحد' }),
      field('unit_area', 'متراژ واحد', 'number', { group: 'واحد' }),
      field('total_price', 'بهای کل واحد', 'currency', { source: 'price', required: true, group: 'مالی' }),
      field('payment_steps', 'جدول پرداخت مرحله‌ای', 'textarea', { group: 'مالی' }),
      field('delivery_date', 'تاریخ تحویل واحد', 'date', { group: 'زمان‌بندی' }),
      field('extra_terms', 'شرایط اضافی', 'textarea', { group: 'زمان‌بندی' }),
    ],
    body: `ماده ۱ — طرفین
فروشنده/سازنده: {{builder_name}} به شماره ملی {{builder_national_id}}
خریدار: {{buyer_name}} به شماره ملی {{buyer_national_id}} و تماس {{buyer_mobile}}

ماده ۲ — پروژه
زمین واقع در {{land_address}} با مساحت {{land_area}} و تعداد {{total_units}} واحد که واحد شماره {{unit_no}}، طبقه {{unit_floor}} با متراژ {{unit_area}} مورد معامله این قرارداد است.

ماده ۳ — بهای واحد و نحوه پرداخت
بهای کل واحد {{total_price}} تعیین می‌گردد. پرداخت به شرح زیر انجام می‌شود:
{{payment_steps}}

ماده ۴ — زمان تحویل
تحویل واحد حداکثر تا {{delivery_date}} پس از اخذ پایان‌کار انجام می‌شود.

ماده ۵ — شرایط اضافی
{{extra_terms}}

ماده ۶ — این قرارداد در {{doc_city}} و به تاریخ {{doc_date}} تنظیم و به امضای طرفین رسید.`,
  },
  {
    id: 'tpl-handover',
    title: 'صورتجلسه تحویل و تخلیه ملک',
    category: 'other',
    description: 'ثبت وضعیت ملک، قرائت کنتورها و تحویل کلیدها',
    requiresSignature: true,
    active: true,
    version: 1,
    createdAt: daysAgo(38),
    updatedAt: daysAgo(5),
    createdBy: 'system',
    headerNote: 'وضعیت ملک و کنتورها در تاریخ تحویل به شرح زیر ثبت و توسط طرفین تأیید شد.',
    fields: [
      field('property_address', 'نشانی ملک', 'textarea', { source: 'address', required: true }),
      field('delivery_date', 'تاریخ تحویل', 'date', { required: true }),
      field('deliverer_name', 'تحویل‌دهنده', 'text', { source: 'fullName', required: true }),
      field('receiver_name', 'تحویل‌گیرنده', 'text', { source: 'party2Name', required: true }),
      field('deposit_returned', 'ودیعه بازگردانده‌شده', 'currency', { source: 'deposit' }),
      field('rent_status', 'وضعیت اجاره‌بها و قبوض', 'select', {
        options: ['تسویه کامل', 'بدهی جزئی', 'بدهی معوق'],
        defaultValue: 'تسویه کامل',
      }),
      field('electricity_meter', 'قرائت کنتور برق', 'text'),
      field('gas_meter', 'قرائت کنتور گاز', 'text'),
      field('water_meter', 'قرائت کنتور آب', 'text'),
      field('keys_count', 'تعداد کلید تحویل‌شده', 'number'),
      field('damages', 'ایرادات و خسارات', 'textarea'),
      field('doc_city', 'شهر تنظیم سند', 'text', { source: 'city' }),
      field('doc_date', 'تاریخ تنظیم سند', 'date', { required: true }),
    ],
    body: `صورتجلسه تحویل ملک

ملک به نشانی {{property_address}} در تاریخ {{delivery_date}} تحویل گردید.

تحویل‌دهنده: {{deliverer_name}}
تحویل‌گیرنده: {{receiver_name}}

وضعیت مالی
ودیعه بازگردانده‌شده: {{deposit_returned}}
وضعیت اجاره‌بها و قبوض: {{rent_status}}

قرائت کنتورها
برق: {{electricity_meter}} — گاز: {{gas_meter}} — آب: {{water_meter}}
تعداد کلید تحویل‌شده: {{keys_count}}

ایرادات و خسارات مشاهده‌شده:
{{damages}}

طرفین با مطالعه مفاد این صورتجلسه، صحت موارد فوق را تأیید کرده و به امضا رساندند. محل تنظیم: {{doc_city}} — تاریخ ثبت: {{doc_date}}`,
  },
];
