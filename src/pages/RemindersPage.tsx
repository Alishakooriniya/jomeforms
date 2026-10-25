/* یادآورها — تعریف یادآور زمان‌دار برای کاربران سامانه.
   یادآور در زمان مقرر (تاریخ شمسی + ساعت اختیاری) در اعلان‌های کاربر مقصد
   می‌نشیند و با یک کلیک «انجام‌شده» علامت می‌خورد. */

import { useEffect, useMemo, useState } from 'react';
import type { Reminder } from '../types';
import { useDb, useDbActions } from '../store/DataProvider';
import type { ReminderDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { displayDigits, formatDate, formatRelative, todayInputValue } from '../lib/format';
import {
  REMINDER_STATE_LABELS,
  REMINDER_STATE_OPTIONS,
  REMINDER_STATE_TONE,
  reminderDueAt,
  reminderState,
} from '../lib/reminders';
import type { ReminderState } from '../lib/reminders';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
import { Select, Textarea, TextInput } from '../components/ui/Field';
import { JalaliDatePicker } from '../components/ui/JalaliDatePicker';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import {
  ActiveFilterChip,
  FilterField,
  FilterSelect,
  ListToolbar,
  ResultsSummary,
  SearchInput,
} from '../components/ui/Toolbar';

type ReminderRow = Reminder & { state: ReminderState; dueAt: Date | null };

const emptyDraft = (): ReminderDraft => ({ title: '', date: todayInputValue(), time: '', userId: '', note: '' });

export default function RemindersPage() {
  const { reminders, users, settings } = useDb();
  const { createReminder, deleteReminder } = useDbActions();
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ReminderDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Reminder | null>(null);

  // وضعیت یادآورها به زمان گره خورده؛ هر نیم‌دقیقه تازه می‌شود
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const now = useMemo(() => new Date(nowTick), [nowTick]);

  const rows = useMemo<ReminderRow[]>(
    () => reminders.map((reminder) => ({ ...reminder, state: reminderState(reminder, now), dueAt: reminderDueAt(reminder) })),
    [reminders, now],
  );

  const activeUsers = users.filter((item) => item.active);
  const userOptions = activeUsers.map((item) => ({ value: item.id, label: item.fullName }));
  const userName = (id: string) => users.find((item) => item.id === id)?.fullName ?? '';

  const query = useListQuery<ReminderRow>(rows, {
    pageSize: settings.defaultPageSize,
    search: (row) => [row.title, row.note ?? '', row.userName, row.createdByName].join(' '),
    filters: {
      state: (row, value) => row.state === value,
      user: (row, value) => row.userId === value,
    },
    sorters: {
      title: (a, b) => compareText(a.title, b.title),
      user: (a, b) => compareText(a.userName, b.userName),
      due: (a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0),
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  });

  const openCreate = () => {
    setForm(emptyDraft());
    setCreating(true);
  };

  const submit = () => {
    setSaving(true);
    const result = createReminder(form);
    setSaving(false);
    if (!result.ok) {
      toast.error('یادآور ثبت نشد', result.error);
      return;
    }
    toast.success('یادآور ثبت شد', `برای ${result.reminder?.userName ?? ''}`);
    setCreating(false);
  };

  const columns: Array<Column<ReminderRow>> = [
    {
      key: 'title',
      header: 'یادآور',
      sortable: true,
      sticky: true,
      cell: (row) => (
        <span className="block max-w-72 truncate font-medium text-fg" title={row.note ? `${row.title} — ${row.note}` : row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'برای',
      sortable: true,
      widthClassName: 'w-[170px]',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={row.userName} size={24} />
          <span className="truncate text-fg-muted" title={row.userName}>
            {row.userName}
          </span>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'زمان یادآور',
      sortable: true,
      widthClassName: 'w-[170px]',
      cell: (row) => (
        <span className="num text-fg-muted" title={formatDate(row.date, 'long')}>
          {formatDate(row.date)}
          {row.time ? <span className="text-fg-subtle"> · {displayDigits(row.time)}</span> : null}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'وضعیت',
      widthClassName: 'w-[110px]',
      cell: (row) => (
        <Badge tone={REMINDER_STATE_TONE[row.state]} size="sm" dot>
          {REMINDER_STATE_LABELS[row.state]}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'ثبت',
      sortable: true,
      widthClassName: 'w-[170px]',
      responsiveClass: 'hidden lg:table-cell',
      cell: (row) => (
        <span className="text-fg-subtle" title={formatDate(row.createdAt, 'datetime')}>
          {row.createdByName}
          <span className="num"> · {formatRelative(row.createdAt)}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      widthClassName: 'w-12',
      cell: (row) => (
        <Dropdown
          label="عملیات یادآور"
          items={[
            {
              id: 'delete',
              label: 'حذف یادآور',
              icon: 'trash',
              danger: true,
              onSelect: () => setPendingDelete(row),
            },
          ]}
        />
      ),
    },
  ];

  const advancedCount = [query.filters.user].filter((value) => value && value !== 'all').length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="یادآورها"
        subtitle="یادآور زمان‌دار برای کاربران — در زمان مقرر در اعلان‌های آن‌ها می‌نشیند"
        actions={
          <Button variant="primary" icon="plus" onClick={openCreate}>
            یادآور جدید
          </Button>
        }
      />

      <ListToolbar
        advancedCount={advancedCount}
        summary={<ResultsSummary total={query.total} unit={`از ${displayDigits(reminders.length)} یادآور`} />}
        advanced={
          <>
            <FilterField label="کاربر مقصد">
              <FilterSelect
                value={query.filters.user ?? 'all'}
                onChange={(value) => query.setFilter('user', value)}
                options={userOptions}
                placeholder="همه کاربران"
              />
            </FilterField>
            {query.hasActiveFilters ? (
              <Button variant="ghost" size="sm" icon="refresh" onClick={query.clearAll}>
                پاک‌کردن فیلترها
              </Button>
            ) : null}
          </>
        }
        activeFilters={
          query.hasActiveFilters ? (
            <>
              {query.q ? <ActiveFilterChip label={`جستجو: ${query.q}`} onRemove={() => query.setQ('')} /> : null}
              {query.filters.state && query.filters.state !== 'all' ? (
                <ActiveFilterChip
                  label={`وضعیت: ${REMINDER_STATE_LABELS[query.filters.state as ReminderState]}`}
                  onRemove={() => query.setFilter('state', 'all')}
                />
              ) : null}
              {query.filters.user && query.filters.user !== 'all' ? (
                <ActiveFilterChip
                  label={`کاربر: ${userName(query.filters.user)}`}
                  onRemove={() => query.setFilter('user', 'all')}
                />
              ) : null}
            </>
          ) : null
        }
      >
        <SearchInput value={query.q} onChange={query.setQ} placeholder="متن یادآور یا نام کاربر…" />
        <FilterSelect
          value={query.filters.state ?? 'all'}
          onChange={(value) => query.setFilter('state', value)}
          options={REMINDER_STATE_OPTIONS}
          placeholder="همه وضعیت‌ها"
          icon="filter"
          className="w-40"
        />
      </ListToolbar>

      <div className="card overflow-hidden">
        <DataTable
          rows={query.pageRows}
          columns={columns}
          rowKey={(row) => row.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          empty={
            <EmptyState
              icon="bell"
              title={query.hasActiveFilters ? 'یادآوری با این فیلترها پیدا نشد' : 'یادآوری ثبت نشده است'}
              description={
                query.hasActiveFilters ? 'فیلترها را تغییر دهید.' : 'برای یکی از کاربران یادآور زمان‌دار تعریف کنید.'
              }
              action={
                <Button variant="primary" icon="plus" onClick={openCreate}>
                  یادآور جدید
                </Button>
              }
            />
          }
        />
        {query.total ? (
          <div className="border-t border-line">
            <Pagination
              page={query.page}
              pageCount={query.pageCount}
              total={query.total}
              pageSize={query.pageSize}
              onPageChange={query.setPage}
              onPageSizeChange={query.setPageSize}
            />
          </div>
        ) : null}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="md"
        title="یادآور جدید"
        description="در زمان مقرر به اعلان‌های کاربر انتخاب‌شده می‌نشیند؛ بدون ساعت یعنی ابتدای همان روز."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={saving}>
              انصراف
            </Button>
            <Button variant="primary" icon="check" onClick={submit} loading={saving}>
              ثبت یادآور
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <Textarea
            label="متن یادآور"
            required
            rows={2}
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="مثلاً پیگیری امضای سند پرونده …"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <JalaliDatePicker
              label="تاریخ"
              required
              value={form.date}
              onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
            />
            <TextInput
              label="ساعت (اختیاری)"
              icon="clock"
              dir="ltr"
              className="text-left"
              placeholder="14:30"
              value={form.time ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
            />
          </div>
          <Select
            label="کاربر"
            required
            placeholder="انتخاب کاربر"
            options={userOptions}
            value={form.userId}
            onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
          />
          <Textarea
            label="یادداشت (اختیاری)"
            rows={2}
            value={form.note ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="جزئیات تکمیلی یادآور"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteReminder(pendingDelete.id);
            toast.success('یادآور حذف شد', pendingDelete.title);
          }
          setPendingDelete(null);
        }}
        title="حذف یادآور"
        description={
          <>
            یادآور <b className="text-fg">{pendingDelete?.title}</b> برای{' '}
            <b className="text-fg">{pendingDelete?.userName}</b> حذف می‌شود.
          </>
        }
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
