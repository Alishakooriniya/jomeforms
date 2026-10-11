/* گزارش فعالیت — چه کسی، چه زمانی، چه کاری انجام داد */

import { useMemo, useState } from 'react';
import type { AuditEntity, AuditEntry } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { AUDIT_ENTITY_LABELS } from '../data/labels';
import { displayDigits, formatDate, formatRelative } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';
import { exportCsv } from '../lib/print';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { ActiveFilterChip, FilterBar, FilterSelect, ResultsSummary, SearchInput } from '../components/ui/Toolbar';

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
      from: (entry, value) => entry.at.slice(0, 10) >= value,
      to: (entry, value) => entry.at.slice(0, 10) <= value,
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
      cell: (entry) => (
        <div className="flex flex-col">
          <span className="num text-[11.5px] text-fg">{formatDate(entry.at, 'datetime')}</span>
          <span className="text-[10.5px] text-fg-subtle">{formatRelative(entry.at)}</span>
        </div>
      ),
    },
    {
      key: 'userName',
      header: 'کاربر',
      sortable: true,
      cell: (entry) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={entry.userName} size={30} />
          <span className="text-[12px] text-fg">{entry.userName}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'عملیات',
      sortable: true,
      cell: (entry) => <span className="text-[12.5px] text-fg">{entry.action}</span>,
    },
    {
      key: 'entity',
      header: 'بخش',
      cell: (entry) => (
        <Badge tone="neutral" size="sm">
          {AUDIT_ENTITY_LABELS[entry.entity]}
        </Badge>
      ),
      responsiveClass: 'hidden md:table-cell',
    },
    {
      key: 'entityLabel',
      header: 'مورد',
      cell: (entry) => (
        <div className="flex flex-col">
          <span className="truncate text-[11.5px] text-fg-muted">{entry.entityLabel ?? '—'}</span>
          {entry.detail ? <span className="truncate text-[10.5px] text-fg-subtle">{entry.detail}</span> : null}
        </div>
      ),
      responsiveClass: 'hidden lg:table-cell',
    },
  ];

  const handleExport = () => {
    exportCsv(
      `audit-${new Date().toISOString().slice(0, 10)}.csv`,
      ['زمان', 'کاربر', 'عملیات', 'بخش', 'مورد', 'جزئیات'],
      query.rows.map((entry) => [
        entry.at,
        entry.userName,
        entry.action,
        AUDIT_ENTITY_LABELS[entry.entity],
        entry.entityLabel ?? '',
        entry.detail ?? '',
      ]),
    );
    toast.success('خروجی گزارش فعالیت آماده شد');
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="گزارش فعالیت"
        subtitle="ردیابی کامل عملیات کاربران برای پیگیری و پاسخ‌گویی"
        icon="history"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'گزارش فعالیت' }]}
        actions={
          <>
            {can('reports.export') ? (
              <Button variant="secondary" icon="download" onClick={handleExport} disabled={!query.rows.length}>
                خروجی CSV
              </Button>
            ) : null}
            {can('settings.edit') && audit.length ? (
              <Button variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
                پاک‌کردن گزارش
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar actions={<ResultsSummary total={query.total} unit="رویداد" />}>
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="جستجوی کاربر، عملیات یا مورد…"
          className="w-full sm:w-64"
        />
        <FilterSelect
          value={query.filters.entity ?? 'all'}
          onChange={(value) => query.setFilter('entity', value)}
          options={ENTITY_OPTIONS}
          placeholder="همه بخش‌ها"
          icon="filter"
        />
        <FilterSelect
          value={query.filters.userId ?? 'all'}
          onChange={(value) => query.setFilter('userId', value)}
          options={userOptions}
          placeholder="همه کاربران"
        />
        <label className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
          از
          <input
            type="date"
            className="field h-9 w-36 py-0 text-[12px]"
            value={query.filters.from && query.filters.from !== 'all' ? query.filters.from : ''}
            onChange={(event) => query.setFilter('from', event.target.value)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
          تا
          <input
            type="date"
            className="field h-9 w-36 py-0 text-[12px]"
            value={query.filters.to && query.filters.to !== 'all' ? query.filters.to : ''}
            onChange={(event) => query.setFilter('to', event.target.value)}
          />
        </label>
        {query.hasActiveFilters ? (
          <Button variant="ghost" size="sm" icon="refresh" onClick={query.clearAll}>
            پاک‌کردن فیلترها
          </Button>
        ) : null}
      </FilterBar>

      {query.hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5">
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
        </div>
      ) : null}

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

      <Card>
        <CardHeader title="خلاصه فعالیت کاربران" icon="chart" />
        <CardBody className="flex flex-wrap gap-2">
          {users.map((user) => {
            const count = audit.filter((entry) => entry.userId === user.id).length;
            return (
              <span key={user.id} className="chip">
                {user.fullName}
                <span className="num text-fg">{displayDigits(count)}</span>
              </span>
            );
          })}
        </CardBody>
      </Card>

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
