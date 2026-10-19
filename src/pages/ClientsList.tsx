/* فهرست پرونده‌ها — جستجو، فیلتر، مرتب‌سازی، خروجی و ساخت/ویرایش */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Client } from '../types';
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
import { displayDigits, formatCode, formatDate } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareNumber, compareText } from '../lib/utils';
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
  FilterBar,
  FilterSelect,
  ResultsSummary,
  SearchInput,
} from '../components/ui/Toolbar';
import { ClientForm, clientToDraft } from '../components/clients/ClientForm';

export default function ClientsList() {
  const { clients, companies, settings, documents } = useDb();
  const { saveClient, deleteClient } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [editing, setEditing] = useState<Client | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const query = useListQuery<Client>(clients, {
    pageSize: settings.defaultPageSize,
    search: (client) =>
      [
        client.fullName,
        client.code,
        client.nationalId,
        companies.find((company) => company.id === client.companyId)?.name ?? '',
      ].join(' '),
    filters: {
      status: (client, value) => client.status === value,
      caseType: (client, value) => (client.caseType ?? 'document_request') === value,
    },
    sorters: {
      code: (a, b) => compareText(a.code, b.code),
      fullName: (a, b) => compareText(a.fullName, b.fullName),
      area: (a, b) => compareNumber(a.area, b.area),
      updatedAt: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
  });

  useEffect(() => {
    const caseType = searchParams.get('caseType');
    if (caseType === 'document_request' || caseType === 'rent_renewal') {
      query.setFilter('caseType', caseType);
    }
  }, [query.setFilter, searchParams]);

  const documentCount = (clientId: string) => documents.filter((document) => document.clientId === clientId).length;

  const handleExport = () => {
    exportCsv(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['شماره پرونده', 'نام', 'کد ملی', 'موبایل', 'نوع درخواست', 'مجموعه', 'وضعیت', 'تاریخ ثبت'],
      query.rows.map((client) => [
        client.code,
        client.fullName,
        client.nationalId,
        client.mobile,
        CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request'],
        companies.find((company) => company.id === client.companyId)?.name ?? '',
        CLIENT_STATUS_LABELS[client.status],
        client.createdAt.slice(0, 10),
      ]),
    );
    toast.success('خروجی CSV آماده شد');
  };

  const submit = (draft: ClientDraft) => {
    setSubmitting(true);
    const saved = saveClient(draft, editing?.id);
    setSubmitting(false);
    setEditing(null);
    toast.success(editing ? 'پرونده ویرایش شد' : 'پرونده ثبت شد', `${saved.fullName} — ${formatCode(saved.code)}`);
  };

  const columns: Array<Column<Client>> = [
    {
      key: 'fullName',
      header: 'پرونده',
      sortable: true,
      cell: (client) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={client.fullName} size={32} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{client.fullName}</p>
            <p className="num truncate text-[10.5px] text-fg-subtle">{formatCode(client.code)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'caseType',
      header: 'نوع درخواست',
      cell: (client) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] text-fg">{CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request']}</span>
          <span className="text-[10.5px] text-fg-subtle">
            {companies.find((company) => company.id === client.companyId)?.name ?? 'بدون مجموعه'}
          </span>
        </div>
      ),
      responsiveClass: 'hidden md:table-cell',
    },
    {
      key: 'workflow',
      header: 'مرحله رسیدگی',
      cell: (client) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] text-fg">{client.workflow?.find((step) => step.status === 'pending')?.title ?? 'تکمیل‌شده'}</span>
          <span className="num text-[10.5px] text-fg-subtle">{displayDigits(client.workflow?.filter((step) => step.status === 'completed').length ?? 0)} مرحله تکمیل‌شده</span>
        </div>
      ),
      responsiveClass: 'hidden lg:table-cell',
    },
    {
      key: 'documents',
      header: 'اسناد',
      align: 'center',
      cell: (client) => <span className="num text-[12px] text-fg-muted">{displayDigits(documentCount(client.id))}</span>,
      responsiveClass: 'hidden lg:table-cell',
    },
    {
      key: 'status',
      header: 'وضعیت',
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
      cell: (client) => <span className="text-[11.5px] text-fg-muted">{formatDate(client.updatedAt)}</span>,
      responsiveClass: 'hidden xl:table-cell',
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
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
                    label: 'ساخت سند از قالب',
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="پرونده‌ها"
        subtitle="ثبت درخواست‌ها، پیگیری مراحل و جمع‌آوری اسناد پرونده"
        icon="users"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'پرونده‌ها' }]}
        actions={
          <>
            {can('clients.export') ? (
              <Button variant="secondary" icon="download" onClick={handleExport} disabled={!query.rows.length}>
                خروجی CSV
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

      <FilterBar
        actions={<ResultsSummary total={query.total} unit="پرونده" />}
      >
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="نام کامل، کد ملی، شماره پرونده یا نام مجموعه…"
          className="w-full sm:w-72"
        />
        <FilterSelect
          value={query.filters.status ?? 'all'}
          onChange={(value) => query.setFilter('status', value)}
          options={CLIENT_STATUS_OPTIONS}
          placeholder="همه وضعیت‌ها"
          icon="filter"
        />
        <FilterSelect
          value={query.filters.caseType ?? 'all'}
          onChange={(value) => query.setFilter('caseType', value)}
          options={CLIENT_CASE_TYPE_OPTIONS}
          placeholder="همه گروه‌های درخواست"
        />
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
              label={`وضعیت: ${CLIENT_STATUS_LABELS[query.filters.status as Client['status']]}`}
              onRemove={() => query.setFilter('status', 'all')}
            />
          ) : null}
          {query.filters.caseType && query.filters.caseType !== 'all' ? (
            <ActiveFilterChip
              label={`نوع درخواست: ${CLIENT_CASE_TYPE_LABELS[query.filters.caseType as keyof typeof CLIENT_CASE_TYPE_LABELS]}`}
              onRemove={() => query.setFilter('caseType', 'all')}
            />
          ) : null}
        </div>
      ) : null}

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
                  : 'برای شروع، نخستین پرونده را ثبت کنید تا اطلاعات مشتری و ملک ذخیره شود.'
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
        icon="users"
        size="xl"
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
            deleteClient(pendingDelete.id);
            toast.success('پرونده حذف شد', pendingDelete.fullName);
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
