/* فهرست پرونده‌ها — جستجو، فیلتر، مرتب‌سازی، خروجی و ساخت/ویرایش */

import { useEffect, useMemo, useState } from 'react';
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
  DEAL_KIND_LABELS,
  DEAL_KIND_OPTIONS,
  PARTY_ROLE_LABELS,
  PROPERTY_KIND_LABELS,
  PROPERTY_KIND_OPTIONS,
} from '../data/labels';
import { displayDigits, formatCode, formatDate, formatMoneyShort } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareNumber, compareText, unique } from '../lib/utils';
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
import { ClientForm, clientToDraft, emptyClientDraft } from '../components/clients/ClientForm';

export default function ClientsList() {
  const { clients, settings, documents } = useDb();
  const { saveClient, deleteClient } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ?new=1 و ?status=... از داشبورد
  useEffect(() => {
    if (searchParams.get('new') === '1' && can('clients.create')) {
      setCreating(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, can]);

  const cityOptions = useMemo(
    () => unique(clients.map((client) => client.city).filter(Boolean)).map((city) => ({ value: city, label: city })),
    [clients],
  );

  const query = useListQuery<Client>(clients, {
    pageSize: settings.defaultPageSize,
    search: (client) =>
      [
        client.fullName,
        client.code,
        client.mobile,
        client.phone ?? '',
        client.nationalId,
        client.address,
        client.city,
        client.region ?? '',
        client.party2Name ?? '',
        client.agentName ?? '',
        client.tags.join(' '),
      ].join(' '),
    filters: {
      status: (client, value) => client.status === value,
      dealKind: (client, value) => client.dealKind === value,
      propertyKind: (client, value) => client.propertyKind === value,
      city: (client, value) => client.city === value,
    },
    sorters: {
      code: (a, b) => compareText(a.code, b.code),
      fullName: (a, b) => compareText(a.fullName, b.fullName),
      price: (a, b) => compareNumber(a.price, b.price),
      area: (a, b) => compareNumber(a.area, b.area),
      updatedAt: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
  });

  const documentCount = (clientId: string) => documents.filter((document) => document.clientId === clientId).length;

  const handleExport = () => {
    exportCsv(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['شماره پرونده', 'نام', 'کد ملی', 'موبایل', 'نقش', 'نوع معامله', 'وضعیت', 'شهر', 'نوع ملک', 'متراژ', 'قیمت', 'ودیعه', 'اجاره', 'مشاور', 'تاریخ ثبت'],
      query.rows.map((client) => [
        client.code,
        client.fullName,
        client.nationalId,
        client.mobile,
        PARTY_ROLE_LABELS[client.partyRole],
        DEAL_KIND_LABELS[client.dealKind],
        CLIENT_STATUS_LABELS[client.status],
        client.city,
        PROPERTY_KIND_LABELS[client.propertyKind],
        client.area,
        client.price,
        client.deposit,
        client.rent,
        client.agentName ?? '',
        client.createdAt.slice(0, 10),
      ]),
    );
    toast.success('خروجی CSV آماده شد');
  };

  const submit = (draft: ClientDraft) => {
    setSubmitting(true);
    const saved = saveClient(draft, editing?.id);
    setSubmitting(false);
    setCreating(false);
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
      key: 'dealKind',
      header: 'معامله',
      cell: (client) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] text-fg">{DEAL_KIND_LABELS[client.dealKind]}</span>
          <span className="text-[10.5px] text-fg-subtle">{PARTY_ROLE_LABELS[client.partyRole]}</span>
        </div>
      ),
      responsiveClass: 'hidden md:table-cell',
    },
    {
      key: 'property',
      header: 'ملک',
      cell: (client) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] text-fg">
            {PROPERTY_KIND_LABELS[client.propertyKind]} — {client.city}
          </span>
          <span className="num text-[10.5px] text-fg-subtle">
            {client.area ? `${displayDigits(client.area)} متر` : '—'}
          </span>
        </div>
      ),
      responsiveClass: 'hidden lg:table-cell',
    },
    {
      key: 'price',
      header: 'مبلغ',
      sortable: true,
      cell: (client) => (
        <span className="num text-[12px] text-fg">
          {client.price ? formatMoneyShort(client.price) : client.deposit ? formatMoneyShort(client.deposit) : '—'}
        </span>
      ),
      responsiveClass: 'hidden sm:table-cell',
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
        subtitle="اطلاعات مشتری و ملک؛ پایه‌ی تکمیل خودکار همه فرم‌ها"
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
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
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
          placeholder="جستجوی نام، شماره پرونده، موبایل، کد ملی، نشانی…"
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
          value={query.filters.dealKind ?? 'all'}
          onChange={(value) => query.setFilter('dealKind', value)}
          options={DEAL_KIND_OPTIONS}
          placeholder="همه معاملات"
        />
        <FilterSelect
          value={query.filters.propertyKind ?? 'all'}
          onChange={(value) => query.setFilter('propertyKind', value)}
          options={PROPERTY_KIND_OPTIONS}
          placeholder="همه انواع ملک"
        />
        <FilterSelect
          value={query.filters.city ?? 'all'}
          onChange={(value) => query.setFilter('city', value)}
          options={cityOptions}
          placeholder="همه شهرها"
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
          {query.filters.city && query.filters.city !== 'all' ? (
            <ActiveFilterChip label={`شهر: ${query.filters.city}`} onRemove={() => query.setFilter('city', 'all')} />
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
                  <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
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

      {/* ساخت / ویرایش */}
      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `ویرایش پرونده ${editing.fullName}` : 'ثبت پرونده جدید'}
        description="اطلاعات وارد‌شده در ادامه به‌صورت خودکار در فرم‌ها جای‌گذاری می‌شود."
        icon="users"
        size="xl"
      >
        <ClientForm
          initial={editing ? clientToDraft(editing) : emptyClientDraft(settings)}
          submitting={submitting}
          submitLabel={editing ? 'ذخیره تغییرات' : 'ثبت پرونده'}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
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
