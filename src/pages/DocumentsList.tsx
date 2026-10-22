/* فهرست اسناد و فرم‌های تکمیل‌شده */

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
import { ActiveFilterChip, FilterBar, FilterSelect, ResultsSummary, SearchInput } from '../components/ui/Toolbar';
import { PageHeader } from '../components/ui/Avatar';
import { JalaliDatePicker } from '../components/ui/JalaliDatePicker';

export default function DocumentsList() {
  const { documents, templates, settings } = useDb();
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
  // فیلترهای ورودی از طریق نشانی (داشبورد، پرونده، ...)
  const statusParam = searchParams.get('status');
  const clientParam = searchParams.get('client');
  const templateParam = searchParams.get('template');
  useEffect(() => {
    if (statusParam) setFilter('status', statusParam);
    if (templateParam) setFilter('templateId', templateParam);
  }, [statusParam, templateParam, setFilter]);

  const clientFiltered = useMemo(
    () => (clientParam ? documents.filter((document) => document.clientId === clientParam) : null),
    [documents, clientParam],
  );

  const rows = clientFiltered ?? query.rows;
  const pagedRows = clientFiltered
    ? clientFiltered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
    : query.pageRows;
  const total = clientFiltered ? clientFiltered.length : query.total;

  const templateOptions = useMemo(
    () => templates.map((template) => ({ value: template.id, label: template.title })),
    [templates],
  );

  const handlePrint = (document: DocRecord) => {
    const template = templates.find((item) => item.id === document.templateId);
    if (!template) {
      toast.error('قالب این سند پیدا نشد');
      return;
    }
    const ok = printDocument(document, template, settings);
    if (!ok) toast.warn('پنجره چاپ باز نشد', 'اجازه بازشدن پنجره جدید را در مرورگر فعال کنید.');
  };

  const handleExport = () => {
    exportCsv(
      `documents-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.csv`,
      ['شماره سند', 'عنوان', 'پرونده', 'وضعیت', 'اسکن', 'سازنده', 'تاریخ ثبت'],
      rows.map((document) => [
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
      cell: (document) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300">
            <span className="text-[10.5px] font-medium">{displayDigits(document.number.split('-').pop() ?? '')}</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{document.title}</p>
            <p className="num truncate text-[10.5px] text-fg-subtle">{formatCode(document.number)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'پرونده',
      cell: (document) =>
        document.clientName ? (
          <button
            type="button"
            className="link text-[12px]"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/clients/${document.clientId}`);
            }}
          >
            {document.clientName}
          </button>
        ) : (
          <span className="text-[11.5px] text-fg-subtle">بدون پرونده</span>
        ),
      responsiveClass: 'hidden md:table-cell',
    },
    {
      key: 'status',
      header: 'وضعیت',
      sortable: true,
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
      cell: (document) => (
        <span className="num text-[12px] text-fg-muted">
          {document.scanIds.length ? displayDigits(document.scanIds.length) : '—'}
        </span>
      ),
      responsiveClass: 'hidden lg:table-cell',
    },
    {
      key: 'createdAt',
      header: 'تاریخ ثبت',
      sortable: true,
      cell: (document) => <span className="text-[11.5px] text-fg-muted">{formatDate(document.createdAt)}</span>,
      responsiveClass: 'hidden sm:table-cell',
    },
    {
      key: 'createdBy',
      header: 'ثبت‌کننده',
      cell: (document) => <span className="text-[11.5px] text-fg-muted">{document.createdByName}</span>,
      responsiveClass: 'hidden xl:table-cell',
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
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
                      setDocumentStatus(document.id, option.value as DocStatus);
                      toast.success('وضعیت سند تغییر کرد', option.label);
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="اسناد و فرم‌ها"
        subtitle="سند ساخته‌شده از قالب‌ها، آماده چاپ، امضا و بایگانی اسکن"
        icon="file-text"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'اسناد' }]}
        actions={
          <>
            {can('documents.export') ? (
              <Button variant="secondary" icon="download" onClick={handleExport} disabled={!rows.length}>
                خروجی CSV
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

      {clientParam ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-brand-50/60 px-3 py-2 text-[12px] text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          <span>فقط اسناد یک پرونده نمایش داده می‌شود.</span>
          <button
            type="button"
            className="font-medium underline underline-offset-4"
            onClick={() => {
              searchParams.delete('client');
              setSearchParams(searchParams, { replace: true });
            }}
          >
            نمایش همه اسناد
          </button>
        </div>
      ) : null}

      <FilterBar actions={<ResultsSummary total={total} unit="سند" />}>
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="جستجوی عنوان، شماره سند، نام پرونده یا مقدار فیلدها…"
          className="w-full sm:w-72"
        />
        <FilterSelect
          value={query.filters.status ?? 'all'}
          onChange={(value) => query.setFilter('status', value)}
          options={DOC_STATUS_OPTIONS}
          placeholder="همه وضعیت‌ها"
          icon="filter"
        />
        <FilterSelect
          value={query.filters.templateId ?? 'all'}
          onChange={(value) => query.setFilter('templateId', value)}
          options={templateOptions}
          placeholder="همه قالب‌ها"
        />
        <div className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
          <span>از تاریخ</span>
          <JalaliDatePicker
            ariaLabel="از تاریخ"
            containerClassName="w-36"
            className="h-9 py-0 text-[12px]"
            value={query.filters.from && query.filters.from !== 'all' ? query.filters.from : ''}
            onChange={(value) => query.setFilter('from', value)}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
          <span>تا تاریخ</span>
          <JalaliDatePicker
            ariaLabel="تا تاریخ"
            containerClassName="w-36"
            className="h-9 py-0 text-[12px]"
            value={query.filters.to && query.filters.to !== 'all' ? query.filters.to : ''}
            onChange={(value) => query.setFilter('to', value)}
          />
        </div>
        {query.hasActiveFilters ? (
          <Button variant="ghost" size="sm" icon="refresh" onClick={query.clearAll}>
            پاک‌کردن فیلترها
          </Button>
        ) : null}
      </FilterBar>

      {query.hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {query.q ? <ActiveFilterChip label={`جستجو: ${query.q}`} onRemove={() => query.setQ('')} /> : null}
          {query.filters.status && query.filters.status !== 'all' ? (
            <ActiveFilterChip
              label={`وضعیت: ${DOC_STATUS_LABELS[query.filters.status as DocStatus]}`}
              onRemove={() => query.setFilter('status', 'all')}
            />
          ) : null}
          {query.filters.templateId && query.filters.templateId !== 'all' ? (
            <ActiveFilterChip
              label={`قالب: ${templates.find((item) => item.id === query.filters.templateId)?.title ?? ''}`}
              onRemove={() => query.setFilter('templateId', 'all')}
            />
          ) : null}
          {query.filters.from && query.filters.from !== 'all' ? (
            <ActiveFilterChip label={`از ${formatDate(query.filters.from)}`} onRemove={() => query.setFilter('from', 'all')} />
          ) : null}
          {query.filters.to && query.filters.to !== 'all' ? (
            <ActiveFilterChip label={`تا ${formatDate(query.filters.to)}`} onRemove={() => query.setFilter('to', 'all')} />
          ) : null}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <DataTable
          rows={pagedRows}
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
                  : 'یک قالب فرم انتخاب کنید، پرونده را متصل کنید و اطلاعات به‌صورت خودکار جای‌گذاری می‌شود.'
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
        {total ? (
          <div className="border-t border-line">
            <Pagination
              page={query.page}
              pageCount={clientFiltered ? Math.max(1, Math.ceil(total / query.pageSize)) : query.pageCount}
              total={total}
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
            deleteDocument(pendingDelete.id);
            toast.success('سند حذف شد', pendingDelete.number);
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
