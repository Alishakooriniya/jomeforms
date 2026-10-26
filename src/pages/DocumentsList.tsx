/* فهرست اسناد و فرم‌های تکمیل‌شده — نمای فشرده با فیلترهای اصلی و پیشرفته */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DocRecord, DocStatus } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { DOC_STATUS_LABELS, DOC_STATUS_OPTIONS, DOC_STATUS_TONE } from '../data/labels';
import { displayDigits, formatCode, formatDate } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';
import { exportCsv } from '../lib/print';
import { printDocument } from '../lib/documentActions';
import { jalaliDateFromDate, jalaliToGregorianIso } from '../lib/jalali';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
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
import { PageHeader } from '../components/ui/Avatar';
import { JalaliDatePicker } from '../components/ui/JalaliDatePicker';

export default function DocumentsList() {
  const { documents, templates, settings, clients } = useDb();
  const { deleteDocument, setDocumentStatus } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingDelete, setPendingDelete] = useState<DocRecord | null>(null);

  const query = useListQuery<DocRecord>(documents, {
    pageSize: settings.defaultPageSize,
    search: (document) =>
      [
        document.title,
        document.number,
        document.clientName ?? '',
        document.clientCode ?? '',
        document.createdByName,
        document.notes ?? '',
        Object.values(document.values).join(' '),
      ].join(' '),
    filters: {
      status: (document, value) => document.status === value,
      templateId: (document, value) => document.templateId === value,
      clientId: (document, value) => document.clientId === value,
      createdBy: (document, value) => document.createdBy === value,
      from: (document, value) => {
        const date = jalaliToGregorianIso(value);
        return Boolean(date && document.createdAt.slice(0, 10) >= date);
      },
      to: (document, value) => {
        const date = jalaliToGregorianIso(value);
        return Boolean(date && document.createdAt.slice(0, 10) <= date);
      },
    },
    sorters: {
      title: (a, b) => compareText(a.title, b.title),
      number: (a, b) => compareText(a.number, b.number),
      status: (a, b) => compareText(a.status, b.status),
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  });

  const { setFilter } = query;
  const statusParam = searchParams.get('status');
  const clientParam = searchParams.get('client');
  const templateParam = searchParams.get('template');

  useEffect(() => {
    if (statusParam && statusParam in DOC_STATUS_LABELS) setFilter('status', statusParam);
    if (templateParam) setFilter('templateId', templateParam);
    if (clientParam) setFilter('clientId', clientParam);
  }, [statusParam, templateParam, clientParam, setFilter]);

  const templateOptions = useMemo(
    () => templates.map((template) => ({ value: template.id, label: template.title })),
    [templates],
  );

  const clientName = useMemo(
    () => clients.find((client) => client.id === query.filters.clientId)?.fullName ?? '',
    [clients, query.filters.clientId],
  );

  const advancedCount = ['templateId', 'from', 'to'].filter((key) => {
    const value = query.filters[key];
    return value && value !== 'all';
  }).length;

  const handlePrint = (document: DocRecord) => {
    const template = templates.find((item) => item.id === document.templateId);
    if (!template) {
      toast.error('فرم این سند پیدا نشد');
      return;
    }
    const ok = printDocument(document, template, settings);
    if (!ok) toast.warn('پنجره چاپ باز نشد', 'اجازه بازشدن پنجره جدید را در مرورگر فعال کنید.');
  };

  const handleExport = () => {
    exportCsv(
      `documents-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.csv`,
      ['شماره سند', 'عنوان', 'پرونده', 'وضعیت', 'اسکن', 'سازنده', 'تاریخ ثبت'],
      query.rows.map((document) => [
        document.number,
        document.title,
        document.clientName ?? '',
        DOC_STATUS_LABELS[document.status],
        document.scanIds.length,
        document.createdByName,
        formatDate(document.createdAt, 'numeric'),
      ]),
    );
    toast.success('خروجی CSV آماده شد');
  };

  const columns: Array<Column<DocRecord>> = [
    {
      key: 'title',
      header: 'سند',
      sortable: true,
      sticky: true,
      cell: (document) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-fg" title={document.title}>
            {document.title}
          </span>
          <span className="num shrink-0 text-[10.5px] text-fg-subtle">{formatCode(document.number)}</span>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'پرونده',
      widthClassName: 'w-[170px]',
      responsiveClass: 'hidden md:table-cell',
      cell: (document) =>
        document.clientName ? (
          <button
            type="button"
            className="block max-w-[160px] truncate text-start text-brand-700 hover:underline dark:text-brand-300"
            title={document.clientName}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/clients/${document.clientId}`);
            }}
          >
            {document.clientName}
          </button>
        ) : (
          <span className="text-fg-subtle">بدون پرونده</span>
        ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      sortable: true,
      widthClassName: 'w-[120px]',
      cell: (document) => (
        <Badge tone={DOC_STATUS_TONE[document.status]} size="sm" dot>
          {DOC_STATUS_LABELS[document.status]}
        </Badge>
      ),
    },
    {
      key: 'scans',
      header: 'اسکن',
      align: 'center',
      widthClassName: 'w-[70px]',
      responsiveClass: 'hidden lg:table-cell',
      cell: (document) => (
        <span className="num text-[11px] text-fg-muted">
          {document.scanIds.length ? displayDigits(document.scanIds.length) : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ ثبت',
      sortable: true,
      widthClassName: 'w-[110px]',
      responsiveClass: 'hidden sm:table-cell',
      cell: (document) => (
        <span className="num text-[11px] text-fg-subtle" title={formatDate(document.createdAt, 'datetime')}>
          {formatDate(document.createdAt)}
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'ثبت‌کننده',
      widthClassName: 'w-[120px]',
      responsiveClass: 'hidden xl:table-cell',
      cell: (document) => (
        <span className="block max-w-[110px] truncate text-[11px] text-fg-muted" title={document.createdByName}>
          {document.createdByName}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      widthClassName: 'w-12',
      cell: (document) => (
        <Dropdown
          label="عملیات سند"
          items={[
            { id: 'view', label: 'مشاهده و بارگذاری اسکن', icon: 'eye', onSelect: () => navigate(`/documents/${document.id}`) },
            ...(can('documents.print')
              ? [{ id: 'print', label: 'چاپ / خروجی PDF', icon: 'print' as const, onSelect: () => handlePrint(document) }]
              : []),
            ...(can('documents.status')
              ? [
                  { id: 'divider', label: '', separator: true, onSelect: () => {} },
                  ...DOC_STATUS_OPTIONS.filter((option) => option.value !== document.status).map((option) => ({
                    id: `status-${option.value}`,
                    label: `تغییر وضعیت به ${option.label}`,
                    icon: 'refresh' as const,
                    onSelect: () => {
                      void setDocumentStatus(document.id, option.value as DocStatus)
                        .then(() => toast.success('وضعیت سند تغییر کرد', option.label))
                        .catch((error: unknown) =>
                          toast.error(error instanceof Error ? error.message : 'تغییر وضعیت انجام نشد.'),
                        );
                    },
                  })),
                ]
              : []),
            ...(can('documents.delete')
              ? [
                  { id: 'divider2', label: '', separator: true, onSelect: () => {} },
                  {
                    id: 'delete',
                    label: 'حذف سند',
                    icon: 'trash' as const,
                    danger: true,
                    onSelect: () => setPendingDelete(document),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  const clearClientParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('client');
    setSearchParams(next, { replace: true });
    query.setFilter('clientId', 'all');
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="اسناد و فرم‌ها"
        subtitle="اسناد ساخته‌شده از فرم‌ها؛ آماده چاپ، امضا و بایگانی اسکن"
        actions={
          <>
            {can('documents.export') ? (
              <Button variant="secondary" icon="download" onClick={handleExport} disabled={!query.rows.length}>
                خروجی
              </Button>
            ) : null}
            {can('documents.create') ? (
              <Button variant="primary" icon="plus" to="/documents/new">
                سند جدید
              </Button>
            ) : null}
          </>
        }
      />

      <ListToolbar
        advancedCount={advancedCount}
        summary={<ResultsSummary total={query.total} unit="سند" />}
        advanced={
          <>
            <FilterField label="فرم">
              <FilterSelect
                value={query.filters.templateId ?? 'all'}
                onChange={(value) => query.setFilter('templateId', value)}
                options={templateOptions}
                placeholder="همه فرم‌ها"
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
          query.hasActiveFilters || clientName ? (
            <>
              {query.q ? <ActiveFilterChip label={`جستجو: ${query.q}`} onRemove={() => query.setQ('')} /> : null}
              {query.filters.status && query.filters.status !== 'all' ? (
                <ActiveFilterChip
                  label={`وضعیت: ${DOC_STATUS_LABELS[query.filters.status as DocStatus]}`}
                  onRemove={() => query.setFilter('status', 'all')}
                />
              ) : null}
              {query.filters.templateId && query.filters.templateId !== 'all' ? (
                <ActiveFilterChip
                  label={`فرم: ${templates.find((item) => item.id === query.filters.templateId)?.title ?? ''}`}
                  onRemove={() => query.setFilter('templateId', 'all')}
                />
              ) : null}
              {query.filters.from && query.filters.from !== 'all' ? (
                <ActiveFilterChip label={`از ${formatDate(query.filters.from)}`} onRemove={() => query.setFilter('from', 'all')} />
              ) : null}
              {query.filters.to && query.filters.to !== 'all' ? (
                <ActiveFilterChip label={`تا ${formatDate(query.filters.to)}`} onRemove={() => query.setFilter('to', 'all')} />
              ) : null}
              {clientName ? (
                <ActiveFilterChip label={`پرونده: ${clientName}`} onRemove={clearClientParam} />
              ) : null}
            </>
          ) : null
        }
      >
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="عنوان، شماره سند، پرونده یا مقدار فیلدها…"
        />
        <FilterSelect
          value={query.filters.status ?? 'all'}
          onChange={(value) => query.setFilter('status', value)}
          options={DOC_STATUS_OPTIONS}
          placeholder="همه وضعیت‌ها"
          icon="filter"
          className="w-40"
        />
      </ListToolbar>

      <div className="card overflow-hidden">
        <DataTable
          rows={query.pageRows}
          columns={columns}
          rowKey={(document) => document.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          onRowClick={(document) => navigate(`/documents/${document.id}`)}
          empty={
            <EmptyState
              icon="file-text"
              title={query.hasActiveFilters ? 'سندی با این فیلترها پیدا نشد' : 'هنوز سندی ساخته نشده است'}
              description={
                query.hasActiveFilters
                  ? 'فیلترها یا بازه تاریخ را تغییر دهید.'
                  : 'یک فرم انتخاب کنید، پرونده را متصل کنید و اطلاعات خودکار جای‌گذاری می‌شود.'
              }
              action={
                query.hasActiveFilters ? (
                  <Button variant="soft" icon="refresh" onClick={query.clearAll}>
                    پاک‌کردن فیلترها
                  </Button>
                ) : can('documents.create') ? (
                  <Button variant="primary" icon="plus" to="/documents/new">
                    ساخت سند
                  </Button>
                ) : null
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

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteDocument(pendingDelete.id)
              .then(() => toast.success('سند حذف شد', pendingDelete.number))
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'حذف سند انجام نشد.'),
              );
          }
          setPendingDelete(null);
        }}
        title="حذف سند"
        description="سند و همه اسکن‌های پیوست آن حذف می‌شوند. این عمل قابل بازگشت نیست."
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
