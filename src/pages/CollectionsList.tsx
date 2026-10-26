/* مجموعه‌ها — شرکت‌ها و مالکان زمین + اتصال کاربران هر مجموعه.
   نمای اصلی فهرستی و فشرده است؛ آمار و راهنما در نوار خلاصه آمده‌اند. */

import { useState } from 'react';
import type { Company } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { CompanyDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { COMPANY_KIND_LABELS, COMPANY_KIND_OPTIONS } from '../data/labels';
import { displayDigits, formatDate, formatNumber } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareNumber, compareText } from '../lib/utils';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
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
import { CompanyForm, companyToDraft, emptyCompanyDraft } from '../components/companies/CompanyForm';
import { CompanyMembersDialog } from '../components/companies/CompanyMembersDialog';

export default function CollectionsList() {
  const { companies, users, settings } = useDb();
  const { saveCompany, deleteCompany, setCompanyMembers } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [membersFor, setMembersFor] = useState<Company | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const membersOf = (companyId: string) => users.filter((user) => user.companyId === companyId);

  const query = useListQuery<Company>(companies, {
    pageSize: settings.defaultPageSize,
    search: (company) =>
      [
        company.name,
        company.managerName ?? '',
        company.phone ?? '',
        company.mobile ?? '',
        company.nationalId ?? '',
        company.address ?? '',
        company.note ?? '',
        COMPANY_KIND_LABELS[company.kind],
      ].join(' '),
    filters: {
      kind: (company, value) => company.kind === value,
      state: (company, value) => (value === 'active' ? company.active : !company.active),
      membership: (company, value) =>
        value === 'with' ? membersOf(company.id).length > 0 : membersOf(company.id).length === 0,
    },
    sorters: {
      name: (a, b) => compareText(a.name, b.name),
      kind: (a, b) => compareText(COMPANY_KIND_LABELS[a.kind], COMPANY_KIND_LABELS[b.kind]),
      members: (a, b) => compareNumber(membersOf(a.id).length, membersOf(b.id).length),
      plotCount: (a, b) => compareNumber(a.plotCount ?? 0, b.plotCount ?? 0),
      totalArea: (a, b) => compareNumber(a.totalArea ?? 0, b.totalArea ?? 0),
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  });

  const submit = async (draft: CompanyDraft) => {
    if (!draft.name.trim()) {
      toast.error('نام مجموعه را وارد کنید.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompany(draft, editing?.id);
      setCreating(false);
      setEditing(null);
      toast.success(editing ? 'مجموعه ویرایش شد' : 'مجموعه افزوده شد', saved.name);
    } catch (error) {
      toast.error('ذخیره نشد', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const columns: Array<Column<Company>> = [
    {
      key: 'name',
      header: 'مجموعه',
      sortable: true,
      sticky: true,
      cell: (company) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={company.name} size={26} />
          <span className="truncate font-medium text-fg" title={company.name}>
            {company.name}
          </span>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'نوع',
      widthClassName: 'w-[120px]',
      cell: (company) => (
        <Badge tone="neutral" size="sm">
          {COMPANY_KIND_LABELS[company.kind]}
        </Badge>
      ),
    },
    {
      key: 'manager',
      header: 'رابط',
      widthClassName: 'w-[180px]',
      responsiveClass: 'hidden lg:table-cell',
      cell: (company) => (
        <span
          className="block max-w-[170px] truncate text-fg-muted"
          title={[company.managerName, company.mobile || company.phone].filter(Boolean).join(' — ')}
        >
          {company.managerName || <span className="text-fg-subtle">ثبت نشده</span>}
          {company.mobile || company.phone ? (
            <span className="num text-fg-subtle"> · {displayDigits(company.mobile || company.phone || '')}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'members',
      header: 'کاربران',
      sortable: true,
      widthClassName: 'w-[90px]',
      responsiveClass: 'hidden md:table-cell',
      cell: (company) => {
        const count = membersOf(company.id).length;
        return (
          <span className="num" title={membersOf(company.id).map((user) => user.fullName).join('، ')}>
            {displayDigits(count)}
            <span className="text-[10.5px] text-fg-subtle"> کاربر</span>
          </span>
        );
      },
    },
    {
      key: 'land',
      header: 'زمین',
      widthClassName: 'w-[180px]',
      responsiveClass: 'hidden xl:table-cell',
      cell: (company) => (
        <span className="num text-fg-muted">
          {company.plotCount ? `${formatNumber(company.plotCount)} قطعه` : '—'}
          {company.totalArea ? (
            <span className="text-fg-subtle"> · {formatNumber(company.totalArea)} متر</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'وضعیت',
      widthClassName: 'w-[100px]',
      cell: (company) => (
        <Badge tone={company.active ? 'success' : 'neutral'} size="sm" dot>
          {company.active ? 'فعال' : 'غیرفعال'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      widthClassName: 'w-12',
      cell: (company) => {
        const items = [
          ...(can('companies.assign')
            ? [
                {
                  id: 'members',
                  label: 'اتصال کاربران',
                  icon: 'link' as const,
                  onSelect: () => setMembersFor(company),
                },
              ]
            : []),
          ...(can('companies.edit')
            ? [
                {
                  id: 'edit',
                  label: 'ویرایش مجموعه',
                  icon: 'edit' as const,
                  onSelect: () => setEditing(company),
                },
              ]
            : []),
          ...(can('companies.delete')
            ? [
                { id: 'sep', label: '', separator: true, onSelect: () => {} },
                {
                  id: 'delete',
                  label: 'حذف مجموعه',
                  icon: 'trash' as const,
                  danger: true,
                  onSelect: () => setPendingDelete(company),
                },
              ]
            : []),
        ];
        return items.length ? <Dropdown label="عملیات مجموعه" items={items} /> : null;
      },
    },
  ];

  const advancedCount = ['membership', 'state'].filter((key) => {
    const value = query.filters[key];
    return value && value !== 'all';
  }).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="مجموعه‌ها"
        subtitle="شرکت‌ها و مالکان زمین و کاربران متصل به هر مجموعه"
        actions={
          <>
            {can('users.view') ? (
              <Button variant="secondary" icon="user-cog" to="/users">
                کاربران
              </Button>
            ) : null}
            {can('companies.create') ? (
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                مجموعه جدید
              </Button>
            ) : null}
          </>
        }
      />

      <ListToolbar
        advancedCount={advancedCount}
        summary={
          <ResultsSummary
            total={query.total}
            unit={`از ${displayDigits(companies.length)} مجموعه`}
          />
        }
        advanced={
          <>
            <FilterField label="وضعیت کاربران">
              <FilterSelect
                value={query.filters.membership ?? 'all'}
                onChange={(value) => query.setFilter('membership', value)}
                options={[
                  { value: 'with', label: 'دارای کاربر' },
                  { value: 'without', label: 'بدون کاربر' },
                ]}
                placeholder="همه"
              />
            </FilterField>
            <FilterField label="وضعیت مجموعه">
              <FilterSelect
                value={query.filters.state ?? 'all'}
                onChange={(value) => query.setFilter('state', value)}
                options={[
                  { value: 'active', label: 'فعال' },
                  { value: 'inactive', label: 'غیرفعال' },
                ]}
                placeholder="همه"
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
              {query.filters.kind && query.filters.kind !== 'all' ? (
                <ActiveFilterChip
                  label={`نوع: ${COMPANY_KIND_LABELS[query.filters.kind as Company['kind']]}`}
                  onRemove={() => query.setFilter('kind', 'all')}
                />
              ) : null}
              {query.filters.membership && query.filters.membership !== 'all' ? (
                <ActiveFilterChip
                  label={query.filters.membership === 'with' ? 'دارای کاربر' : 'بدون کاربر'}
                  onRemove={() => query.setFilter('membership', 'all')}
                />
              ) : null}
              {query.filters.state && query.filters.state !== 'all' ? (
                <ActiveFilterChip
                  label={query.filters.state === 'active' ? 'فعال' : 'غیرفعال'}
                  onRemove={() => query.setFilter('state', 'all')}
                />
              ) : null}
            </>
          ) : null
        }
      >
        <SearchInput value={query.q} onChange={query.setQ} placeholder="نام مجموعه، رابط یا تلفن…" />
        <FilterSelect
          value={query.filters.kind ?? 'all'}
          onChange={(value) => query.setFilter('kind', value)}
          options={COMPANY_KIND_OPTIONS}
          placeholder="همه نوع‌ها"
          icon="filter"
          className="w-40"
        />
      </ListToolbar>

      <div className="card overflow-hidden">
        <DataTable
          rows={query.pageRows}
          columns={columns}
          rowKey={(company) => company.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          empty={
            <EmptyState
              icon="building"
              title={query.hasActiveFilters ? 'مجموعه‌ای با این فیلترها پیدا نشد' : 'هنوز مجموعه‌ای ثبت نشده است'}
              description={
                query.hasActiveFilters
                  ? 'فیلترها را تغییر دهید.'
                  : 'شرکت‌ها و مالکانی که قطعه‌زمین در اختیار دارند را اضافه کنید.'
              }
              action={
                can('companies.create') ? (
                  <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                    افزودن مجموعه
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
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        size="lg"
        title={editing ? `ویرایش مجموعه: ${editing.name}` : 'افزودن مجموعه جدید'}
        description={
          editing
            ? `ثبت‌شده در ${formatDate(editing.createdAt, 'numeric')}`
            : 'شرکت یا مالک زمین را با اطلاعات تماس و تعداد قطعه‌ها ثبت کنید.'
        }
      >
        <CompanyForm
          initial={editing ? companyToDraft(editing) : emptyCompanyDraft()}
          submitLabel={editing ? 'ذخیره تغییرات' : 'افزودن مجموعه'}
          submitting={saving}
          onSubmit={submit}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <CompanyMembersDialog
        open={Boolean(membersFor)}
        onClose={() => setMembersFor(null)}
        company={membersFor}
        users={users}
        companies={companies}
        saving={saving}
        onSave={(userIds) => {
          if (!membersFor) return;
          setSaving(true);
          void setCompanyMembers(membersFor.id, userIds).then((result) => {
            setSaving(false);
            if (!result.ok) {
              toast.error('ذخیره نشد', result.error);
              return;
            }
            toast.success(
              'ارتباط کاربران ذخیره شد',
              `${displayDigits(result.added)} اتصال • ${displayDigits(result.removed)} جدایی`,
            );
            setMembersFor(null);
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteCompany(pendingDelete.id).then((result) => {
              if (result.ok) {
                toast.success(
                  'مجموعه حذف شد',
                  result.detached
                    ? `${displayDigits(result.detached)} کاربر بدون مجموعه شدند`
                    : pendingDelete.name,
                );
              } else {
                toast.error('حذف انجام نشد', result.error);
              }
            });
          }
          setPendingDelete(null);
        }}
        title="حذف مجموعه"
        description={
          <>
            مجموعه <b className="text-fg">{pendingDelete?.name}</b> حذف می‌شود.
            {pendingDelete && membersOf(pendingDelete.id).length ? (
              <>
                {' '}
                {displayDigits(membersOf(pendingDelete.id).length)} کاربر به آن وصل هستند و بدون مجموعه خواهند شد؛
                حساب‌هایشان حذف نمی‌شود.
              </>
            ) : null}{' '}
            سوابق فعالیت باقی می‌ماند.
          </>
        }
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
