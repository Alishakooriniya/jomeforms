-- چیدمان کانواسی فرم‌ها: مقدار فیلدها روی قاب ثابتِ تصویری فرم کاغذی در جای
-- دقیق خودش چاپ می‌شود (مانند سربرگ). canvas یک jsonb با frame + placements است.

alter table form_templates
  drop constraint if exists form_templates_print_layout_check;
alter table form_templates
  add constraint form_templates_print_layout_check
    check (print_layout is null or print_layout in ('document-request-a4', 'canvas-a4'));
alter table form_templates
  add column canvas jsonb;

alter table form_template_versions
  drop constraint if exists form_template_versions_print_layout_check;
alter table form_template_versions
  add constraint form_template_versions_print_layout_check
    check (print_layout is null or print_layout in ('document-request-a4', 'canvas-a4'));
alter table form_template_versions
  add column canvas jsonb;

-- فرم رسمی FN04 «تقاضای صدور سند» دفتر منطقه‌ای
insert into form_templates
  (id, title, category, print_layout, canvas, description, fields, body,
   requires_signature, active, version, created_by)
values (
  '7f040000-0000-4000-8000-0000000000f4',
  'تقاضای صدور سند',
  'other',
  'document-request-a4',
  null,
  'فرم رسمی FN04 دفتر منطقه‌ای — متن پویا و روان، جایگزینی فیلدها بدون نمایش جاخالی و انطباق کامل با قطع A4 و کادر رسمی.',
  '[
    {"id":"tf_fn04_date","key":"request_date","label":"تاریخ تقاضا","type":"date","required":false},
    {"id":"tf_fn04_name","key":"full_name","label":"نام و نام خانوادگی متقاضی","type":"text","required":true,"source":"fullName"},
    {"id":"tf_fn04_father","key":"father_name","label":"نام پدر (فرزند)","type":"text","required":false,"source":"fatherName"},
    {"id":"tf_fn04_cert","key":"certificate_no","label":"شماره شناسنامه","type":"text","required":false,"source":"birthCertificateNumber"},
    {"id":"tf_fn04_nid","key":"national_id","label":"کد ملی","type":"nationalId","required":true,"source":"nationalId"},
    {"id":"tf_fn04_issue","key":"issue_place","label":"صادره (محل صدور شناسنامه)","type":"text","required":false,"source":"issuePlace"},
    {"id":"tf_fn04_addr","key":"address","label":"نشانی سکونت","type":"text","required":false,"source":"address"},
    {"id":"tf_fn04_phone","key":"phone","label":"تلفن","type":"mobile","required":false,"source":"mobile"},
    {"id":"tf_fn04_since","key":"since_date","label":"از تاریخ تصرف","type":"date","required":false},
    {"id":"tf_fn04_area","key":"area","label":"مساحت (متر مربع)","type":"number","required":false},
    {"id":"tf_fn04_parcel","key":"land_parcel","label":"قطعه زمین","type":"select","required":false,"options":["اراضی مزرعه هاشم آباد پلاک ثبتی یک اصلی","اراضی مزرعه عبدلخانی پلاک ۲۴۶ اصلی"]}
  ]'::jsonb,
  'احتراماً نظر به اینکه اینجانب {{full_name}} فرزند {{father_name}} شماره شناسنامه {{certificate_no}} دارای کد ملی {{national_id}} صادره {{issue_place}} ساکن {{address}} تلفن {{phone}} از تاریخ {{since_date}} متصرف یک قطعه زمین از اراضی مزرعه هاشم آباد پلاک ثبتی یک اصلی {{land_parcel:اراضی مزرعه هاشم آباد پلاک ثبتی یک اصلی}} مزرعه عبدلخانی پلاک ۲۴۶ اصلی {{land_parcel:اراضی مزرعه عبدلخانی پلاک ۲۴۶ اصلی}} واقع در بخش هفت چناران به مساحت {{area}} متر مربع بشرح تقسیم نامه و قولنامه پیوست می باشم .

مستدعی است نسبت به عقد قرارداد با اینجانب وفق ضوابط و مقررات اوقاف اقدام مبذول فرمایید .',
  false,
  true,
  1,
  null
)
on conflict (id) do update set
  print_layout = excluded.print_layout,
  fields = excluded.fields,
  body = excluded.body;

insert into form_template_versions (template_id, version, title, fields, body, print_layout, canvas)
select id, version, title, fields, body, print_layout, canvas
from form_templates
where id = '7f040000-0000-4000-8000-0000000000f4'
on conflict (template_id, version) do nothing;
