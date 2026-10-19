-- ============================================================================
--  سامانه مدیریت پرونده و فرم‌های املاک — ساختار پایگاه‌داده (PostgreSQL 14+)
--
--  این فایل با مدل داده سمت کلاینت (src/types.ts) یکسان است.
--  نگاشت سریع:
--    User          → users (+ user_permissions, company_id)
--    Company       → companies (مجموعه: شرکت/مالک زمین)
--    PermissionRole→ roles (+ role_permissions)
--    Client        → clients (+ case_workflow_evidence)
--    FormTemplate  → form_templates (+ form_template_versions)
--    DocRecord     → documents (+ document_status_history)
--    ScanFile      → document_scans
--    AuditEntry    → audit_logs
--    AppSettings   → app_settings
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------------------------------------------------------------------------
-- ۱) انواع شمارشی (enum) — همان مقادیر ثابت سمت کلاینت
-- ----------------------------------------------------------------------------
create type user_role          as enum ('superadmin', 'admin');
create type client_status      as enum ('new', 'in_progress', 'awaiting_docs', 'done', 'archived');
create type client_case_type   as enum ('document_request', 'rent_renewal');
create type party_role         as enum ('buyer', 'seller', 'tenant', 'landlord', 'consultant');
create type property_kind      as enum ('apartment', 'house', 'villa', 'land', 'office', 'store', 'warehouse');
create type deal_kind          as enum ('sale', 'rent', 'mortgage', 'presale', 'partnership');
create type template_category  as enum ('sale', 'rent', 'mortgage', 'presale', 'commission', 'visit', 'other');
create type document_status    as enum ('draft', 'awaiting_signature', 'signed', 'scanned', 'archived');
create type company_kind       as enum ('owner', 'developer', 'cooperative', 'investor', 'org', 'other');
create type audit_entity       as enum ('auth', 'client', 'document', 'template', 'user', 'role', 'company', 'settings', 'scan', 'workflow');

-- ----------------------------------------------------------------------------
-- ۲) کاربران و دسترسی‌ها
-- ----------------------------------------------------------------------------
create table users (
  id              uuid primary key default gen_random_uuid(),
  username        citext not null unique,
  full_name       text   not null,
  password_hash   text   not null,              -- bcrypt/argon2 (هرگز رمز خام ذخیره نشود)
  role            user_role not null default 'admin',
  title           text,
  mobile          text,
  active          boolean not null default true,
  note            text,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references users(id) on delete set null
);

-- کاتالوگ دسترسی‌ها (هم‌نام با src/data/permissions.ts)
create table permissions (
  key         text primary key,          -- مثل clients.create
  group_id    text not null,             -- dashboard | clients | documents | ...
  label       text not null,
  sort_order  integer not null default 0
);

-- دسترسی‌های مستقیم هر کاربر (کاملاً سفارشی)
create table user_permissions (
  user_id         uuid not null references users(id) on delete cascade,
  permission_key  text not null references permissions(key) on delete cascade,
  granted_by      uuid references users(id) on delete set null,
  granted_at      timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- نقش‌ها / بسته‌های دسترسی قابل استفاده مجدد
create table roles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  is_system    boolean not null default false,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table role_permissions (
  role_id        uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- نشست‌ها (در صورت استفاده از توکن سمت سرور؛ در حالت JWT لازم نیست)
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null,
  user_agent  text,
  ip_address  inet,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ۳) پرونده‌ها و مسیر رسیدگی
-- ----------------------------------------------------------------------------
create table clients (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,          -- پ-۱۴۰۵-۰۰۰۱
  full_name           text not null,
  national_id         text,
  mobile              text,
  case_type           client_case_type not null default 'document_request',
  company_id          uuid,
  workflow            jsonb not null default '[]'::jsonb, -- ClientWorkflowStep[]
  phone               text,
  email               text,
  father_name         text,
  birth_date          date,

  party_role          party_role not null default 'buyer',
  party2_name         text,
  party2_role         party_role not null default 'seller',
  party2_national_id  text,
  party2_mobile       text,

  deal_kind           deal_kind not null default 'sale',
  status              client_status not null default 'new',

  province            text,
  city                text,
  address             text,
  region              text,
  property_kind       property_kind not null default 'apartment',
  area                numeric(12,2) not null default 0,
  plate               text,
  unit                text,
  floor               text,
  build_year          text,

  price               numeric(18,0) not null default 0,
  deposit             numeric(18,0) not null default 0,
  rent                numeric(18,0) not null default 0,
  commission_percent   numeric(5,2) not null default 0.5,

  agent_name          text,
  source              text,
  tags                text[] not null default '{}',
  notes               text,
  extra               jsonb  not null default '{}'::jsonb,   -- فیلدهای دلخواه فرم‌های آینده

  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index clients_status_idx        on clients (status);
create index clients_city_idx          on clients (city);
create index clients_full_name_idx     on clients (full_name);
create index clients_national_id_idx   on clients (national_id);
create index clients_case_type_idx     on clients (case_type);
create index clients_agent_idx         on clients (agent_name);
-- جستجوی متنی فارسی روی نام، نشانی و شماره‌ها
create index clients_search_idx        on clients
  using gin (to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(address,'') || ' ' || coalesce(code,'')));

create table case_workflow_evidence (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  step_id       text not null,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    bigint not null default 0,
  storage_key   text not null,
  uploaded_by   uuid references users(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

create index case_workflow_evidence_client_idx on case_workflow_evidence (client_id, step_id);

-- ----------------------------------------------------------------------------
-- ۴) قالب فرم‌ها + نسخه‌ها
-- ----------------------------------------------------------------------------
create table form_templates (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  category            template_category not null default 'other',
  description         text,
  fields              jsonb not null default '[]'::jsonb,  -- TemplateField[]
  body                text  not null default '',            -- متن با نشانه‌های {{key}}
  header_note         text,
  footer_note         text,
  requires_signature  boolean not null default true,
  active              boolean not null default true,
  version             integer not null default 1,
  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index form_templates_category_idx on form_templates (category);
create index form_templates_fields_idx   on form_templates using gin (fields jsonb_path_ops);

-- تاریخچه نسخه‌ها: هر ویرایش یک ردیف تغییرناپذیر
create table form_template_versions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references form_templates(id) on delete cascade,
  version      integer not null,
  title        text not null,
  fields       jsonb not null,
  body         text not null,
  changed_by   uuid references users(id) on delete set null,
  changed_at   timestamptz not null default now(),
  unique (template_id, version)
);

-- ----------------------------------------------------------------------------
-- ۵) اسناد ساخته‌شده از قالب‌ها
-- ----------------------------------------------------------------------------
create table documents (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique,           -- س-۱۴۰۵-۰۰۰۱
  title             text not null,
  template_id       uuid references form_templates(id) on delete set null,
  template_version  integer not null default 1,
  client_id         uuid references clients(id) on delete set null,
  values            jsonb not null default '{}'::jsonb,   -- مقادیر فیلدها
  status            document_status not null default 'draft',
  tags              text[] not null default '{}',
  notes             text,
  printed_at        timestamptz,
  signed_at         timestamptz,
  created_by        uuid references users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- برای نگه‌داشتن نسخه قالب در سندهای قدیمی، متن نهایی هم ذخیره می‌شود
alter table documents add column rendered_body text;

create index documents_status_idx    on documents (status);
create index documents_client_idx    on documents (client_id);
create index documents_template_idx  on documents (template_id);
create index documents_created_idx   on documents (created_at desc);
create index documents_values_idx    on documents using gin (values jsonb_path_ops);

-- گردش کار سند (برای نمایش تاریخچه تغییر وضعیت)
create table document_status_history (
  id           bigserial primary key,
  document_id  uuid not null references documents(id) on delete cascade,
  from_status  document_status,
  to_status    document_status not null,
  changed_by   uuid references users(id) on delete set null,
  changed_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ۶) فایل‌های اسکن‌شده (نسخه امضاشده)
--    فایل روی فضای ذخیره‌سازی (S3/دیسک) و فراداده در پایگاه‌داده
-- ----------------------------------------------------------------------------
create table document_scans (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    bigint not null default 0,
  storage_key   text not null,          -- کلید فایل در فضای ذخیره‌سازی
  pages         integer default 1,
  note          text,
  checksum      text,                   -- SHA-256 برای تشخیص تکرار/دستکاری
  uploaded_by   uuid references users(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

create index document_scans_document_idx on document_scans (document_id);

-- ----------------------------------------------------------------------------
-- ۷) گزارش فعالیت
-- ----------------------------------------------------------------------------
create table audit_logs (
  id            bigserial primary key,
  user_id       uuid references users(id) on delete set null,
  user_name     text not null,
  action        text not null,
  entity        audit_entity not null,
  entity_id     text,
  entity_label  text,
  detail        text,
  ip_address    inet,
  created_at    timestamptz not null default now()
);

create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_entity_idx  on audit_logs (entity, entity_id);
create index audit_logs_user_idx    on audit_logs (user_id);

-- ----------------------------------------------------------------------------
-- ۸) تنظیمات سازمان (تک‌ردیفی)
-- ----------------------------------------------------------------------------
create table app_settings (
  id                  boolean primary key default true check (id),
  org_name            text not null default 'املاک',
  org_legal_name      text,
  org_phone           text,
  org_address         text,
  default_province    text,
  default_city        text,
  doc_prefix          text not null default 'س-',
  client_prefix       text not null default 'پ-',
  show_persian_digits boolean not null default true,
  default_page_size   integer not null default 10,
  contract_note       text,
  updated_at          timestamptz not null default now()
);

-- شماره‌گذاری ترتیبی سند و پرونده به تفکیک سال
create table number_sequences (
  kind        text not null,        -- 'document' | 'client'
  year        text not null,        -- سال شمسی
  last_number integer not null default 0,
  primary key (kind, year)
);

-- تابع گرفتن شماره بعدی (اتمیک، مناسب همزمانی)
create or replace function next_sequence(p_kind text, p_year text)
returns integer language plpgsql as $$
declare next_value integer;
begin
  insert into number_sequences (kind, year, last_number)
  values (p_kind, p_year, 1)
  on conflict (kind, year) do update set last_number = number_sequences.last_number + 1
  returning last_number into next_value;
  return next_value;
end $$;

-- ----------------------------------------------------------------------------
-- ۹) تریگر به‌روزرسانی updated_at
-- ----------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger users_touch        before update on users        for each row execute function touch_updated_at();
create trigger clients_touch      before update on clients      for each row execute function touch_updated_at();
create trigger templates_touch    before update on form_templates for each row execute function touch_updated_at();
create trigger documents_touch    before update on documents    for each row execute function touch_updated_at();

-- ----------------------------------------------------------------------------
-- ۱۰) مجموعه‌ها (شرکت/مالک زمین) و کاربران هر مجموعه
--     «مجموعه» شرکتی است که قطعه‌زمین‌های بزرگ در اختیار دارد؛ کاربران سامانه
--     می‌توانند به یک مجموعه وصل باشند (users.company_id) یا بدون مجموعه بمانند.
-- ----------------------------------------------------------------------------
create table companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          company_kind not null default 'other',
  national_id   text,                    -- شناسه ملی / شماره ثبت
  manager_name  text,                    -- رابط یا مدیر مجموعه
  mobile        text,
  phone         text,
  address       text,
  plot_count    integer,                 -- تعداد قطعه‌زمین
  total_area    numeric(14,2),           -- متراژ کل (متر مربع)
  note          text,
  active        boolean not null default true,
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- هر کاربر حداکثر به یک مجموعه وصل می‌شود و این وابستگی اختیاری است
-- (حذف مجموعه کاربران را حذف نمی‌کند؛ فقط company_id آن‌ها null می‌شود)
alter table users add column company_id uuid references companies(id) on delete set null;
alter table clients add constraint clients_company_fk
  foreign key (company_id) references companies(id) on delete set null;

create index companies_name_idx on companies (name);
create index companies_kind_idx on companies (kind);
create index users_company_idx  on users (company_id);
create index clients_company_idx on clients (company_id);

create trigger companies_touch before update on companies for each row execute function touch_updated_at();

-- ----------------------------------------------------------------------------
-- ۱۱) کاتالوگ دسترسی‌ها (هم‌خوان با src/data/permissions.ts)
-- ----------------------------------------------------------------------------
insert into permissions (key, group_id, label, sort_order) values
  ('dashboard.view',      'dashboard', 'مشاهده داشبورد', 1),
  ('clients.view',        'clients',   'مشاهده پرونده‌ها', 1),
  ('clients.create',      'clients',   'ایجاد پرونده', 2),
  ('clients.edit',        'clients',   'ویرایش پرونده', 3),
  ('clients.workflow.advance',  'clients', 'ثبت پیشرفت مراحل پرونده', 4),
  ('clients.workflow.override','clients', 'عبور مدیریتی از شرط مرحله', 5),
  ('clients.delete',      'clients',   'حذف پرونده', 6),
  ('clients.export',      'clients',   'خروجی گرفتن از پرونده‌ها', 7),
  ('documents.view',      'documents', 'مشاهده اسناد', 1),
  ('documents.create',    'documents', 'ایجاد سند از قالب', 2),
  ('documents.edit',      'documents', 'ویرایش سند', 3),
  ('documents.delete',    'documents', 'حذف سند', 4),
  ('documents.print',     'documents', 'چاپ و خروجی PDF', 5),
  ('documents.export',    'documents', 'خروجی فهرست اسناد', 6),
  ('documents.upload',    'documents', 'بارگذاری اسکن امضاشده', 7),
  ('documents.status',    'documents', 'تغییر وضعیت سند', 8),
  ('templates.view',      'templates', 'مشاهده قالب‌ها', 1),
  ('templates.create',    'templates', 'افزودن قالب فرم', 2),
  ('templates.edit',      'templates', 'ویرایش قالب', 3),
  ('templates.delete',    'templates', 'حذف قالب', 4),
  ('companies.view',      'companies', 'مشاهده مجموعه‌ها', 1),
  ('companies.create',    'companies', 'افزودن مجموعه', 2),
  ('companies.edit',      'companies', 'ویرایش مجموعه', 3),
  ('companies.delete',    'companies', 'حذف مجموعه', 4),
  ('companies.assign',    'companies', 'اتصال کاربران به مجموعه', 5),
  ('users.view',          'users',     'مشاهده کاربران', 1),
  ('users.create',        'users',     'افزودن کاربر', 2),
  ('users.edit',          'users',     'ویرایش کاربر و دسترسی‌ها', 3),
  ('users.delete',        'users',     'حذف/غیرفعال‌کردن کاربر', 4),
  ('roles.view',          'roles',     'مشاهده نقش‌ها', 1),
  ('roles.manage',        'roles',     'ساخت و ویرایش نقش', 2),
  ('reports.view',        'reports',   'مشاهده گزارش‌ها', 1),
  ('reports.export',      'reports',   'خروجی CSV گزارش', 2),
  ('audit.view',          'audit',     'مشاهده گزارش فعالیت', 1),
  ('settings.view',       'settings',  'مشاهده تنظیمات', 1),
  ('settings.edit',       'settings',  'تغییر تنظیمات', 2);

-- ----------------------------------------------------------------------------
-- ۱۲) نماهای گزارش‌گیری (هم‌خوان با صفحه «گزارش‌ها»)
-- ----------------------------------------------------------------------------
create or replace view v_document_status_summary as
select status, count(*) as total
from documents
group by status;

create or replace view v_clients_by_agent as
select coalesce(nullif(agent_name, ''), 'بدون کارشناس') as agent_name,
       count(*)                                        as clients,
       sum(price + deposit)                            as value
from clients
group by 1
order by clients desc;

-- کاربران هر مجموعه + شمارش (برای صفحه «مجموعه‌ها»)
create or replace view v_company_members as
select c.id                                                    as company_id,
       c.name                                                  as company_name,
       c.active                                                as active,
       count(u.id)                                             as users,
       count(u.id) filter (where u.active)                      as active_users
from companies c
left join users u on u.company_id = c.id
group by c.id, c.name, c.active
order by users desc;

create or replace view v_template_usage as
select t.id,
       t.title,
       count(d.id)                                                   as documents,
       count(d.id) filter (where d.status in ('signed','scanned'))   as signed,
       count(d.id) filter (where d.status = 'draft')                 as draft
from form_templates t
left join documents d on d.template_id = t.id
group by t.id, t.title
order by documents desc;

-- ----------------------------------------------------------------------------
-- ۱۳) نکات امنیتی (RLS)
--    سمت سرور باید همه پرس‌وجوها را با شناسه کاربر جاری محدود کند:
--      • superadmin: دسترسی کامل
--      • admin: تنها بخش‌هایی که در user_permissions دارد
--    نمونه:
--      alter table clients enable row level security;
--      create policy clients_select on clients for select
--        using (exists (
--          select 1 from user_permissions p
--          where p.user_id = current_setting('app.user_id')::uuid
--            and p.permission_key = 'clients.view'
--        ));
--    همچنین: رمزها با bcrypt، و بارگذاری اسکن با بررسی نوع/حجم فایل.
-- ----------------------------------------------------------------------------
