-- ============================================================================
--  Jomeforms API — initial schema
--  Mirrors the frontend domain model (src/types.ts) and docs/database-schema.sql.
--  PostgreSQL 14+ (validated on 16).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
create type user_role         as enum ('superadmin', 'admin');
create type company_kind      as enum ('owner', 'developer', 'cooperative', 'investor', 'org', 'other');
create type client_status     as enum ('new', 'in_progress', 'awaiting_docs', 'done', 'archived');
create type client_case_type  as enum ('document_request', 'rent_renewal');
create type party_role        as enum ('buyer', 'seller', 'tenant', 'landlord', 'consultant');
create type property_kind     as enum ('apartment', 'house', 'villa', 'land', 'office', 'store', 'warehouse');
create type deal_kind         as enum ('sale', 'rent', 'mortgage', 'presale', 'partnership');
create type template_category as enum ('sale', 'rent', 'mortgage', 'presale', 'commission', 'visit', 'other');
create type document_status   as enum ('draft', 'awaiting_signature', 'signed', 'scanned', 'archived');
create type audit_entity      as enum ('auth', 'client', 'document', 'template', 'user', 'role', 'company', 'settings', 'scan', 'workflow');

-- ------------------------------------------------------------- companies ----
create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         company_kind not null default 'other',
  national_id  text,
  manager_name text,
  mobile       text,
  phone        text,
  address      text,
  plot_count   integer not null default 0,
  total_area   numeric(14, 2) not null default 0,
  note         text,
  active       boolean not null default true,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index companies_name_idx on companies (name);
create index companies_kind_idx on companies (kind);

-- --------------------------------------------------------- users & access ----
create table users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,
  full_name     text not null,
  password_hash text not null,
  role          user_role not null default 'admin',
  company_id    uuid references companies(id) on delete set null,
  title         text,
  mobile        text,
  active        boolean not null default true,
  note          text,
  last_login_at timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- usernames are case-insensitive
create unique index users_username_lower_uq on users (lower(username));
create index users_company_idx on users (company_id);
create index users_role_idx on users (role);

alter table companies
  add constraint companies_created_by_fk foreign key (created_by) references users(id) on delete set null;
alter table users
  add constraint users_created_by_fk foreign key (created_by) references users(id) on delete set null;

create table permissions (
  key        text primary key,           -- e.g. clients.create
  group_id   text not null,              -- dashboard | clients | documents | ...
  label      text not null,
  sort_order integer not null default 0
);

create table roles (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,               -- stable slug for system presets
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table role_permissions (
  role_id        uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table user_permissions (
  user_id        uuid not null references users(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  granted_by     uuid references users(id) on delete set null,
  granted_at     timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- refresh-token sessions (only a SHA-256 hash of the token is stored)
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  ip_address inet,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_user_idx on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

-- ---------------------------------------------------------------- clients ---
create table clients (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  full_name          text not null,
  national_id        text,
  mobile             text,
  case_type          client_case_type not null default 'document_request',
  company_id         uuid references companies(id) on delete set null,
  workflow           jsonb not null default '[]'::jsonb,
  phone              text,
  email              text,
  father_name        text,
  birth_date         text,
  party_role         party_role not null default 'buyer',
  party2_name        text,
  party2_role        party_role not null default 'seller',
  party2_national_id text,
  party2_mobile      text,
  deal_kind          deal_kind not null default 'sale',
  status             client_status not null default 'new',
  province           text not null default '',
  city               text not null default '',
  address            text not null default '',
  property_kind      property_kind not null default 'apartment',
  area               numeric(12, 2) not null default 0,
  region             text,
  plate              text,
  unit               text,
  floor              text,
  build_year         text,
  price              numeric(18, 0) not null default 0,
  deposit            numeric(18, 0) not null default 0,
  rent               numeric(18, 0) not null default 0,
  commission_percent numeric(5, 2) not null default 0.5,
  agent_name         text,
  source             text,
  tags               text[] not null default '{}',
  notes              text,
  extra              jsonb not null default '{}'::jsonb,
  created_by         uuid references users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index clients_status_idx      on clients (status);
create index clients_city_idx        on clients (city);
create index clients_full_name_idx   on clients (full_name);
create index clients_national_id_idx on clients (national_id);
create index clients_mobile_idx      on clients (mobile);
create index clients_case_type_idx   on clients (case_type);
create index clients_company_idx     on clients (company_id);
create index clients_agent_idx       on clients (agent_name);
create index clients_created_idx     on clients (created_at desc);

create table case_workflow_evidence (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  step_id     text not null,
  file_name   text not null,
  mime_type   text not null,
  size_bytes  bigint not null default 0,
  storage_key text not null,
  checksum    text,
  uploaded_by uuid references users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index case_workflow_evidence_client_idx on case_workflow_evidence (client_id, step_id);

-- -------------------------------------------------------------- templates ---
create table form_templates (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  category           template_category not null default 'other',
  description        text,
  fields             jsonb not null default '[]'::jsonb,
  body               text not null default '',
  header_note        text,
  footer_note        text,
  requires_signature boolean not null default true,
  active             boolean not null default true,
  version            integer not null default 1,
  created_by         uuid references users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index form_templates_category_idx on form_templates (category);
create index form_templates_active_idx   on form_templates (active);

-- immutable history, one row per published version
create table form_template_versions (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references form_templates(id) on delete cascade,
  version     integer not null,
  title       text not null,
  fields      jsonb not null,
  body        text not null,
  changed_by  uuid references users(id) on delete set null,
  changed_at  timestamptz not null default now(),
  unique (template_id, version)
);

-- -------------------------------------------------------------- documents ---
create table documents (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,
  title            text not null,
  template_id      uuid references form_templates(id) on delete set null,
  template_title   text not null default '',      -- snapshot, kept if the template is deleted
  template_version integer not null default 1,
  client_id        uuid references clients(id) on delete set null,
  client_name      text,                          -- snapshot for archived documents
  client_code      text,
  values           jsonb not null default '{}'::jsonb,
  status           document_status not null default 'draft',
  tags             text[] not null default '{}',
  notes            text,
  printed_at       timestamptz,
  signed_at        timestamptz,
  created_by       uuid references users(id) on delete set null,
  created_by_name  text not null default 'سیستم',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index documents_status_idx   on documents (status);
create index documents_client_idx   on documents (client_id);
create index documents_template_idx on documents (template_id);
create index documents_created_idx  on documents (created_at desc);

create table document_status_history (
  id          bigserial primary key,
  document_id uuid not null references documents(id) on delete cascade,
  from_status document_status,
  to_status   document_status not null,
  changed_by  uuid references users(id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index document_status_history_doc_idx on document_status_history (document_id, changed_at desc);

create table document_scans (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  file_name   text not null,
  mime_type   text not null,
  size_bytes  bigint not null default 0,
  storage_key text not null,
  pages       integer not null default 1,
  note        text,
  checksum    text,
  uploaded_by uuid references users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index document_scans_document_idx on document_scans (document_id);

-- ------------------------------------------------------------------ audit ---
create table audit_logs (
  id           bigserial primary key,
  user_id      uuid references users(id) on delete set null,
  user_name    text not null,
  action       text not null,
  entity       audit_entity not null,
  entity_id    text,
  entity_label text,
  detail       text,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_entity_idx  on audit_logs (entity, entity_id);
create index audit_logs_user_idx    on audit_logs (user_id);

-- --------------------------------------------------------------- settings ---
create table app_settings (
  id                  boolean primary key default true check (id),
  org_name            text not null default 'املاک آرین',
  org_legal_name      text not null default 'مشاور املاک آرین',
  org_phone           text not null default '',
  org_address         text not null default '',
  default_province    text not null default 'تهران',
  default_city        text not null default 'تهران',
  doc_prefix          text not null default 'س-',
  client_prefix       text not null default 'پ-',
  show_persian_digits boolean not null default true,
  default_page_size   integer not null default 10,
  contract_note       text not null default '',
  updated_at          timestamptz not null default now()
);

insert into app_settings (id) values (true);

-- atomic per-year numbering for cases and documents
create table number_sequences (
  kind        text not null,        -- 'document' | 'client'
  year        text not null,        -- Jalali year, e.g. 1405
  last_number integer not null default 0,
  primary key (kind, year)
);
