/* فهرست پرونده‌ها — جستجو، فیلتر، مرتب‌سازی، خروجی و ساخت/ویرایش.
   جدول تک‌خطی و فشرده است؛ اطلاعات کم‌کاربردتر در صفحه پرونده دیده می‌شود. */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Client, ClientCaseType, ClientStatus } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { ClientDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_STATUS_TONE,
  CLIENT_CASE_TYPE_LABELS,
  CLIENT_CASE_TYPE_OPTIONS,
} from '../data/labels';
import { formatCode, formatDate } from '../lib/format';
import { jalaliDateFromDate } from '../lib/jalali';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';
import { exportCsv } from '../lib/print';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
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
import { ClientForm, clientToDraft } from '../components/clients/ClientForm';

export default function ClientsList() {
  const { clients, companies, settings } = useDb();
  const { saveClient, deleteClient } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [editing, setEditing] = useState<Client | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const companyName = (id?: string) => companies.find((company) => company.id === id)?.name ?? '';

  const query = useListQuery<Client>(clients, {
    pageSize: settings.defaultPageSize,
    search: (client) =>
      [client.fullName, client.code, client.nationalId, companyName(client.companyId)].join(' '),
    filters: {
      status: (client, value) => client.status === value,
      caseType: (client, value) => (client.caseType ?? 'document_request') === value,
      companyId: (client, value) => client.companyId === value,
    },
    sorters: {
      code: (a, b) => compareText(a.code, b.code),
      fullName: (a, b) => compareText(a.fullName, b.fullName),
      updatedAt: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
  });

  const { setFilter } = query;
  useEffect(() => {
    const caseType = searchParams.get('caseType');
    const status = searchParams.get('status');
    if (caseType === 'document_request' || caseType === 'rent_renewal') setFilter('caseType', caseType);
    if (status && status in CLIENT_STATUS_LABELS) setFilter('status', status);
  }, [setFilter, searchParams]);

  const advancedCount = useMemo(
    () =>
      ['caseType', 'companyId'].filter((key) => {
        const value = query.filters[key];
        return value && value !== 'all';
      }).length,
    [query.filters],
  );

  const handleExport = () => {
    exportCsv(
      `clients-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.csv`,
      ['شماره پرونده', 'نام', 'کد ملی', 'موبایل', 'نوع درخواست', 'مجموعه', 'وضعیت', 'تاریخ ثبت'],
      query.rows.map((client) => [
        client.code,
        client.fullName,
        client.nationalId,
        client.mobile,
        CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request'],
        companyName(client.companyId),
        CLIENT_STATUS_LABELS[client.status],
        formatDate(client.createdAt, 'numeric'),
      ]),
    );
    toast.success('خروجی CSV آماده شد');
  };

  const submit = async (draft: ClientDraft) => {
    setSubmitting(true);
    try {
      const saved = await saveClient(draft, editing?.id);
      setEditing(null);
      toast.success(editing ? 'پرونده ویرایش شد' : 'پرونده ثبت شد', `${saved.fullName} — ${formatCode(saved.code)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ثبت پرونده انجام نشد.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = (client: Client) => (client.workflow ?? []).find((step) => step.status === 'pending');

  const columns: Array<Column<Client>> = [
    {
      key: 'fullName',
      header: 'متقاضی',
      sortable: true,
      sticky: true,
      widthClassName: 'w-[210px]',
      cell: (client) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={client.fullName} size={26} />
          <span className="truncate font-medium text-fg" title={client.fullName}>
            {client.fullName}
          </span>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'شماره پرونده',
      sortable: true,
      widthClassName: 'w-[120px]',
      cell: (client) => <span className="num text-fg-muted">{formatCode(client.code)}</span>,
    },
    {
      key: 'caseType',
      header: 'نوع درخواست',
      widthClassName: 'w-[120px]',
      responsiveClass: 'hidden lg:table-cell',
      cell: (client) => (
        <span className="text-fg-muted">{CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request']}</span>
      ),
    },
    {
      key: 'company',
      header: 'مجموعه',
      responsiveClass: 'hidden xl:table-cell',
      cell: (client) => {
        const name = companyName(client.companyId);
        return (
          <span className="block max-w-[150px] truncate text-fg-muted" title={name || 'بدون مجموعه'}>
            {name || <span className="text-fg-subtle">بدون مجموعه</span>}
          </span>
        );
      },
    },
    {
      key: 'workflow',
      header: 'مرحله جاری',
      responsiveClass: 'hidden md:table-cell',
      widthClassName: 'w-[190px]',
      cell: (client) => {
        const active = currentStep(client);
        return (
          <span
            className="block truncate text-fg-muted"
            title={active ? `مرحله جاری: ${active.title}` : 'همه مراحل تکمیل شده'}
          >
            {active?.title ?? 'تکمیل‌شده'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت',
      widthClassName: 'w-[110px]',
      cell: (client) => (
        <Badge tone={CLIENT_STATUS_TONE[client.status]} size="sm" dot>
          {CLIENT_STATUS_LABELS[client.status]}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: 'آخرین تغییر',
      sortable: true,
      widthClassName: 'w-[110px]',
      responsiveClass: 'hidden xl:table-cell',
      cell: (client) => (
        <span className="num text-[11px] text-fg-subtle" title={formatDate(client.updatedAt, 'datetime')}>
          {formatDate(client.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      widthClassName: 'w-12',
      cell: (client) => (
        <Dropdown
          label="عملیات پرونده"
          items={[
            { id: 'view', label: 'مشاهده پرونده', icon: 'eye', onSelect: () => navigate(`/clients/${client.id}`) },
            ...(can('clients.edit')
              ? [{ id: 'edit', label: 'ویرایش', icon: 'edit' as const, onSelect: () => setEditing(client) }]
              : []),
            ...(can('documents.create')
              ? [
                  {
                    id: 'document',
                    label: 'ساخت سند از فرم',
                    icon: 'file-text' as const,
                    onSelect: () => navigate(`/documents/new?client=${client.id}`),
                  },
                ]
              : []),
            ...(can('clients.delete')
              ? [
                  { id: 'divider', label: '', separator: true, onSelect: () => {} },
                  {
                    id: 'delete',
                    label: 'حذف پرونده',
                    icon: 'trash' as const,
                    danger: true,
                    onSelect: () => setPendingDelete(client),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  const hasChips = query.hasActiveFilters;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="پرونده‌ها"
        subtitle="پیگیری درخواست‌ها، مراحل رسیدگی و اسناد هر پرونده"
        actions={
          <>
            {can('clients.export') ? (
              <Button variant="secondary" icon="download" onClick={handleExport} disabled={!query.rows.length}>
                خروجی
              </Button>
            ) : null}
            {can('clients.create') ? (
              <Button variant="primary" icon="plus" to="/clients/new">
                پرونده جدید
              </Button>
            ) : null}
          </>
        }
      />

      <ListToolbar
        advancedCount={advancedCount}
        summary={<ResultsSummary total={query.total} unit="پرونده" />}
        advanced={
          <>
            <FilterField label="نوع درخواست">
              <FilterSelect
                value={query.filters.caseType ?? 'all'}
                onChange={(value) => query.setFilter('caseType', value)}
                options={CLIENT_CASE_TYPE_OPTIONS}
                placeholder="همه گروه‌ها"
              />
            </FilterField>
            <FilterField label="مجموعه">
              <FilterSelect
                value={query.filters.companyId ?? 'all'}
                onChange={(value) => query.setFilter('companyId', value)}
                options={companies.map((company) => ({ value: company.id, label: company.name }))}
                placeholder="همه مجموعه‌ها"
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
          hasChips ? (
            <>
              {query.q ? <ActiveFilterChip label={`جستجو: ${query.q}`} onRemove={() => query.setQ('')} /> : null}
              {query.filters.status && query.filters.status !== 'all' ? (
                <ActiveFilterChip
                  label={`وضعیت: ${CLIENT_STATUS_LABELS[query.filters.status as ClientStatus]}`}
                  onRemove={() => query.setFilter('status', 'all')}
                />
              ) : null}
              {query.filters.caseType && query.filters.caseType !== 'all' ? (
                <ActiveFilterChip
                  label={`نوع: ${CLIENT_CASE_TYPE_LABELS[query.filters.caseType as ClientCaseType]}`}
                  onRemove={() => query.setFilter('caseType', 'all')}
                />
              ) : null}
              {query.filters.companyId && query.filters.companyId !== 'all' ? (
                <ActiveFilterChip
                  label={`مجموعه: ${companyName(query.filters.companyId)}`}
                  onRemove={() => query.setFilter('companyId', 'all')}
                />
              ) : null}
              <button
                type="button"
                onClick={query.clearAll}
                className="ms-1 text-[10.5px] text-fg-subtle hover:text-fg"
              >
                پاک‌کردن همه
              </button>
            </>
          ) : null
        }
      >
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="نام، کد ملی، شماره پرونده یا مجموعه…"
        />
        <FilterSelect
          value={query.filters.status ?? 'all'}
          onChange={(value) => query.setFilter('status', value)}
          options={CLIENT_STATUS_OPTIONS}
          placeholder="همه وضعیت‌ها"
          icon="filter"
          className="w-40"
        />
      </ListToolbar>

      <div className="card overflow-hidden">
        <DataTable
          rows={query.pageRows}
          columns={columns}
          rowKey={(client) => client.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          onRowClick={(client) => navigate(`/clients/${client.id}`)}
          empty={
            <EmptyState
              icon="users"
              title={query.hasActiveFilters ? 'پرونده‌ای با این فیلترها پیدا نشد' : 'هنوز پرونده‌ای ثبت نشده است'}
              description={
                query.hasActiveFilters
                  ? 'عبارت جستجو یا فیلترها را تغییر دهید.'
                  : 'برای شروع، نخستین پرونده را با اطلاعات هویتی متقاضی ثبت کنید.'
              }
              action={
                query.hasActiveFilters ? (
                  <Button variant="soft" icon="refresh" onClick={query.clearAll}>
                    پاک‌کردن فیلترها
                  </Button>
                ) : can('clients.create') ? (
                  <Button variant="primary" icon="plus" to="/clients/new">
                    ثبت پرونده
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

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`ویرایش پرونده ${editing?.fullName ?? ''}`}
        size="lg"
      >
        <ClientForm
          initial={editing ? clientToDraft(editing) : undefined}
          submitting={submitting}
          submitLabel="ذخیره تغییرات"
          onCancel={() => setEditing(null)}
          onSubmit={submit}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteClient(pendingDelete.id)
              .then(() => toast.success('پرونده حذف شد', pendingDelete.fullName))
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'حذف پرونده انجام نشد.'),
              );
          }
          setPendingDelete(null);
        }}
        title="حذف پرونده"
        description={
          <>
            پرونده <b className="text-fg">{pendingDelete?.fullName}</b> حذف می‌شود. اسناد ساخته‌شده از این پرونده باقی
            می‌مانند اما ارتباطشان با پرونده قطع می‌شود.
          </>
        }
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
