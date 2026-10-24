/* گزارش فعالیت — چه کسی، چه زمانی، چه کاری انجام داد */

import { useMemo, useState } from 'react';
import type { AuditEntity, AuditEntry } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { AUDIT_ENTITY_LABELS } from '../data/labels';
import { displayDigits, formatDate } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';
import { exportCsv } from '../lib/print';
import { jalaliDateFromDate, jalaliToGregorianIso } from '../lib/jalali';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
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
import { JalaliDatePicker } from '../components/ui/JalaliDatePicker';

const ENTITY_OPTIONS = (Object.keys(AUDIT_ENTITY_LABELS) as AuditEntity[]).map((entity) => ({
  value: entity,
  label: AUDIT_ENTITY_LABELS[entity],
}));

export default function AuditPage() {
  const { audit, users, settings } = useDb();
  const { clearAudit } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const query = useListQuery<AuditEntry>(audit, {
    pageSize: settings.defaultPageSize,
    search: (entry) => `${entry.userName} ${entry.action} ${entry.entityLabel ?? ''} ${entry.detail ?? ''}`,
    filters: {
      entity: (entry, value) => entry.entity === value,
      userId: (entry, value) => entry.userId === value,
      from: (entry, value) => {
        const date = jalaliToGregorianIso(value);
        return Boolean(date && entry.at.slice(0, 10) >= date);
      },
      to: (entry, value) => {
        const date = jalaliToGregorianIso(value);
        return Boolean(date && entry.at.slice(0, 10) <= date);
      },
    },
    sorters: {
      at: (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      userName: (a, b) => compareText(a.userName, b.userName),
      action: (a, b) => compareText(a.action, b.action),
    },
  });

  const userOptions = useMemo(() => users.map((user) => ({ value: user.id, label: user.fullName })), [users]);

  const columns: Array<Column<AuditEntry>> = [
    {
      key: 'at',
      header: 'زمان',
      sortable: true,
      widthClassName: 'w-[130px]',
      cell: (entry) => (
        <span className="num text-[11.5px] text-fg-muted" title={formatDate(entry.at, 'datetime')}>
          {formatDate(entry.at, 'datetime')}
        </span>
      ),
    },
    {
      key: 'userName',
      header: 'کاربر',
      sortable: true,
      widthClassName: 'w-[170px]',
      cell: (entry) => (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={entry.userName} size={24} />
          <span className="truncate text-fg" title={entry.userName}>
            {entry.userName}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'عملیات',
      sortable: true,
      cell: (entry) => (
        <span className="block max-w-[260px] truncate" title={entry.action}>
          {entry.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'بخش',
      widthClassName: 'w-[120px]',
      responsiveClass: 'hidden md:table-cell',
      cell: (entry) => (
        <Badge tone="neutral" size="sm">
          {AUDIT_ENTITY_LABELS[entry.entity]}
        </Badge>
      ),
    },
    {
      key: 'entityLabel',
      header: 'مورد',
      responsiveClass: 'hidden lg:table-cell',
      cell: (entry) => (
        <span
          className="block max-w-[200px] truncate text-fg-muted"
          title={[entry.entityLabel, entry.detail].filter(Boolean).join(' — ')}
        >
          {entry.entityLabel ?? '—'}
        </span>
      ),
    },
  ];

  const handleExport = () => {
    exportCsv(
      `audit-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.csv`,
      ['زمان', 'کاربر', 'عملیات', 'بخش', 'مورد', 'جزئیات'],
      query.rows.map((entry) => [
        formatDate(entry.at, 'datetime'),
        entry.userName,
        entry.action,
        AUDIT_ENTITY_LABELS[entry.entity],
        entry.entityLabel ?? '',
        entry.detail ?? '',
      ]),
    );
    toast.success('خروجی گزارش فعالیت آماده شد');
  };

  const advancedCount = ['userId', 'from', 'to'].filter((key) => {
    const value = query.filters[key];
    return value && value !== 'all';
  }).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="گزارش فعالیت"
        subtitle="ردیابی عملیات کاربران برای پیگیری و پاسخ‌گویی"
        actions={
          <>
            {can('reports.export') ? (
              <Button variant="secondary" icon="download" onClick={handleExport} disabled={!query.rows.length}>
                خروجی
              </Button>
            ) : null}
            {can('settings.edit') && audit.length ? (
              <Button variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
                پاک‌کردن
              </Button>
            ) : null}
          </>
        }
      />

      <ListToolbar
        advancedCount={advancedCount}
        summary={<ResultsSummary total={query.total} unit="رویداد" />}
        advanced={
          <>
            <FilterField label="کاربر">
              <FilterSelect
                value={query.filters.userId ?? 'all'}
                onChange={(value) => query.setFilter('userId', value)}
                options={userOptions}
                placeholder="همه کاربران"
              />
            </FilterField>
            <FilterField label="از تاریخ">
              <JalaliDatePicker
                ariaLabel="از تاریخ"
                containerClassName="w-36"
                className="h-9 py-0 text-[12px]"
                value={query.filters.from && query.filters.from !== 'all' ? query.filters.from : ''}
                onChange={(value) => query.setFilter('from', value)}
              />
            </FilterField>
            <FilterField label="تا تاریخ">
              <JalaliDatePicker
                ariaLabel="تا تاریخ"
                containerClassName="w-36"
                className="h-9 py-0 text-[12px]"
                value={query.filters.to && query.filters.to !== 'all' ? query.filters.to : ''}
                onChange={(value) => query.setFilter('to', value)}
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
              {query.filters.entity && query.filters.entity !== 'all' ? (
                <ActiveFilterChip
                  label={`بخش: ${AUDIT_ENTITY_LABELS[query.filters.entity as AuditEntity]}`}
                  onRemove={() => query.setFilter('entity', 'all')}
                />
              ) : null}
              {query.filters.userId && query.filters.userId !== 'all' ? (
                <ActiveFilterChip
                  label={`کاربر: ${users.find((user) => user.id === query.filters.userId)?.fullName ?? ''}`}
                  onRemove={() => query.setFilter('userId', 'all')}
                />
              ) : null}
              {query.filters.from && query.filters.from !== 'all' ? (
                <ActiveFilterChip label={`از ${formatDate(query.filters.from)}`} onRemove={() => query.setFilter('from', 'all')} />
              ) : null}
              {query.filters.to && query.filters.to !== 'all' ? (
                <ActiveFilterChip label={`تا ${formatDate(query.filters.to)}`} onRemove={() => query.setFilter('to', 'all')} />
              ) : null}
            </>
          ) : null
        }
      >
        <SearchInput value={query.q} onChange={query.setQ} placeholder="کاربر، عملیات یا مورد…" />
        <FilterSelect
          value={query.filters.entity ?? 'all'}
          onChange={(value) => query.setFilter('entity', value)}
          options={ENTITY_OPTIONS}
          placeholder="همه بخش‌ها"
          icon="filter"
          className="w-40"
        />
      </ListToolbar>

      <div className="card overflow-hidden">
        <DataTable
          rows={query.pageRows}
          columns={columns}
          rowKey={(entry) => entry.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          empty={
            <EmptyState
              icon="history"
              title={query.hasActiveFilters ? 'رویدادی با این فیلترها پیدا نشد' : 'گزارشی ثبت نشده است'}
              description="هر عملیات مهم کاربران به‌صورت خودکار اینجا ثبت می‌شود."
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

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAudit();
          setConfirmClear(false);
          toast.success('گزارش فعالیت پاک شد');
        }}
        title="پاک‌کردن گزارش فعالیت"
        description={`${displayDigits(audit.length)} رویداد حذف می‌شود. این کار قابل بازگشت نیست.`}
        confirmLabel="پاک کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
