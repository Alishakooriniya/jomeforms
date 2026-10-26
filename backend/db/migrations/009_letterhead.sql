-- سربرگ سازمان: کادر بالا ثابت است، متن نامه در کادر میانی نوشته می‌شود و
-- نشانی کادر پایین از سمت مدیران قابل ویرایش است (app_settings.letterhead_address).
-- هر چاپ سربرگ برای پیگیری امنیتی در letterhead_prints + گزارش فعالیت ثبت می‌شود.

alter type audit_entity add value if not exists 'letterhead';

alter table app_settings add column if not exists letterhead_address text;

insert into permissions (key, group_id, label, sort_order) values
  ('letterhead.view',   'letterhead', 'استفاده از سربرگ', 1),
  ('letterhead.manage', 'letterhead', 'مدیریت سربرگ و گزارش چاپ', 2)
on conflict (key) do nothing;

-- پیش‌فرض محصول: همه کاربران فعلی اجازه استفاده از سربرگ را دارند؛ مدیر می‌تواند
-- برای هر کاربر آن را بگیرد. مدیریت سربرگ به کسانی داده می‌شود که قبلاً
-- تنظیمات سازمان را ویرایش می‌کردند.
insert into user_permissions (user_id, permission_key)
select u.id, 'letterhead.view'
from users u
where u.role = 'admin'
on conflict (user_id, permission_key) do nothing;

insert into user_permissions (user_id, permission_key)
select up.user_id, 'letterhead.manage'
from user_permissions up
where up.permission_key = 'settings.edit'
on conflict (user_id, permission_key) do nothing;

create table letterhead_prints (
  id         uuid primary key default gen_random_uuid(),
  paper      text not null check (paper in ('A4', 'A5')),
  kind       text not null check (kind in ('blank', 'filled')),
  -- تصویر لحظه‌ای فیلدهای چاپ‌شده تا مشخص شود دقیقاً چه چیزی روی سربرگ رفته است
  values     jsonb not null default '{}'::jsonb,
  user_id    uuid references users(id) on delete set null,
  user_name  text not null,
  created_at timestamptz not null default now()
);

create index letterhead_prints_user_idx    on letterhead_prints (user_id, created_at desc);
create index letterhead_prints_created_idx on letterhead_prints (created_at desc);
