create table reminders (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 300),
  note        text check (note is null or char_length(note) <= 1000),
  -- due date is a user-entered Jalali date, stored as YYYY/MM/DD like other
  -- domain dates; time is an optional HH:MM within the same day
  date        text not null check (date ~ '^[0-9]{4}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  time        text check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  user_id     uuid not null references users(id) on delete cascade,
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references users(id) on delete set null
);

create index reminders_recipient_idx on reminders (user_id, done, date, time);

insert into permissions (key, group_id, label, sort_order)
values ('reminders.manage', 'reminders', 'مدیریت یادآورها', 0)
on conflict (key) do nothing;

alter type audit_entity add value if not exists 'reminder';
