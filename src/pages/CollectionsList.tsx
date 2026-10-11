/* مجموعه‌ها — شرکت‌ها و مالکان زمین + اتصال کاربران هر مجموعه
   ساخت و حذف مجموعه برای سوپرادمین (یا دارنده دسترسی companies.*) و
   اتصال کاربران برای دارنده companies.assign. */

import { useMemo, useState } from 'react';
import type { Company } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { CompanyDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { COMPANY_KIND_LABELS, COMPANY_KIND_OPTIONS } from '../data/labels';
import { displayDigits, formatDate, formatNumber, formatRelative } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareNumber, compareText } from '../lib/utils';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/Card';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { FilterBar, FilterSelect, ResultsSummary, SearchInput } from '../components/ui/Toolbar';
import { CompanyForm, companyToDraft, emptyCompanyDraft } from '../components/companies/CompanyForm';
import { CompanyMembersDialog } from '../components/companies/CompanyMembersDialog';

export default function CollectionsList() {
  const { companies, users, audit, settings } = useDb();
  const { saveCompany, deleteCompany, setCompanyMembers } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [membersFor, setMembersFor] = useState<Company | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const membersOf = (companyId: string) => users.filter((user) => user.companyId === companyId);
  const usersWithoutCompany = useMemo(() => users.filter((user) => !user.companyId).length, [users]);

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

  const submit = (draft: CompanyDraft) => {
    if (!draft.name.trim()) {
      toast.error('نام مجموعه را وارد کنید.');
      return;
    }
    setSaving(true);
    const saved = saveCompany(draft, editing?.id);
    setSaving(false);
    setCreating(false);
    setEditing(null);
    toast.success(editing ? 'مجموعه ویرایش شد' : 'مجموعه افزوده شد', saved.name);
  };

  const columns: Array<Column<Company>> = [
    {
      key: 'name',
      header: 'مجموعه',
      sortable: true,
      cell: (company) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={company.name} size={32} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{company.name}</p>
            <p className="mt-0.5">
              <Badge tone="neutral" size="sm" icon="building">
                {COMPANY_KIND_LABELS[company.kind]}
              </Badge>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'manager',
      header: 'رابط مجموعه',
      cell: (company) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] text-fg">{company.managerName || '—'}</p>
          <p className="num truncate text-[10.5px] text-fg-subtle" dir="ltr">
            {company.mobile || company.phone || ''}
          </p>
        </div>
      ),
      responsiveClass: 'hidden lg:table-cell',
    },
    {
      key: 'members',
      header: 'کاربران',
      sortable: true,
      cell: (company) => {
        const members = membersOf(company.id);
        return (
          <div className="min-w-0">
            <p className="num text-[12px] text-fg">{displayDigits(members.length)} کاربر</p>
            <p className="truncate text-[10.5px] text-fg-subtle">
              {members.length ? members.map((user) => user.fullName).slice(0, 2).join(' • ') : 'بدون کاربر'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'land',
      header: 'زمین',
      cell: (company) => (
        <div className="min-w-0">
          <p className="num text-[12px] text-fg">
            {company.plotCount ? `${formatNumber(company.plotCount)} قطعه` : '—'}
          </p>
          <p className="num truncate text-[10.5px] text-fg-subtle">
            {company.totalArea ? `${formatNumber(company.totalArea)} متر` : ''}
          </p>
        </div>
      ),
      responsiveClass: 'hidden md:table-cell',
    },
    {
      key: 'active',
      header: 'وضعیت',
      align: 'center',
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
        // اگر کاربر هیچ عملیاتی روی مجموعه نداشته باشد، منوی خالی نشان داده نمی‌شود
        return items.length ? <Dropdown label="عملیات مجموعه" items={items} /> : null;
      },
    },
  ];

  const activeCount = companies.filter((company) => company.active).length;
  const withMembers = companies.filter((company) => membersOf(company.id).length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="مجموعه‌ها"
        subtitle="شرکت‌ها و مالکان زمین؛ کاربران هر مجموعه را اینجا مدیریت کنید"
        icon="building"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'مجموعه‌ها' }]}
        actions={
          <>
            {can('users.view') ? (
              <Button variant="secondary" icon="user-cog" to="/users">
                کاربران
              </Button>
            ) : null}
            {can('companies.create') ? (
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                افزودن مجموعه
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="مجموعه‌های ثبت‌شده"
          value={displayDigits(companies.length)}
          hint={`${displayDigits(activeCount)} مجموعه فعال`}
          icon="building"
          tone="brand"
        />
        <StatCard
          label="مجموعه‌های دارای کاربر"
          value={displayDigits(withMembers)}
          hint={`از ${displayDigits(companies.length)} مجموعه`}
          icon="link"
          tone="info"
          onClick={() => query.setFilter('membership', 'with')}
        />
        <StatCard
          label="کاربران متصل به مجموعه"
          value={displayDigits(users.length - usersWithoutCompany)}
          hint={`از مجموع ${displayDigits(users.length)} کاربر`}
          icon="users"
          tone="success"
          onClick={() => query.setFilter('state', 'active')}
        />
        <StatCard
          label="کاربران بدون مجموعه"
          value={displayDigits(usersWithoutCompany)}
          hint="بدون وابستگی به شرکت خاص"
          icon="user"
          tone="neutral"
        />
      </div>

      <FilterBar actions={<ResultsSummary total={query.total} unit="مجموعه" />}>
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="جستجوی نام مجموعه، رابط، تلفن…"
          className="w-full sm:w-64"
        />
        <FilterSelect
          value={query.filters.kind ?? 'all'}
          onChange={(value) => query.setFilter('kind', value)}
          options={COMPANY_KIND_OPTIONS}
          placeholder="همه نوع‌ها"
          icon="filter"
        />
        <FilterSelect
          value={query.filters.membership ?? 'all'}
          onChange={(value) => query.setFilter('membership', value)}
          options={[
            { value: 'with', label: 'دارای کاربر' },
            { value: 'without', label: 'بدون کاربر' },
          ]}
          placeholder="وضعیت کاربران"
        />
        <FilterSelect
          value={query.filters.state ?? 'all'}
          onChange={(value) => query.setFilter('state', value)}
          options={[
            { value: 'active', label: 'فعال' },
            { value: 'inactive', label: 'غیرفعال' },
          ]}
          placeholder="همه وضعیت‌ها"
        />
        {query.hasActiveFilters ? (
          <Button variant="ghost" size="sm" icon="refresh" onClick={query.clearAll}>
            پاک‌کردن فیلترها
          </Button>
        ) : null}
      </FilterBar>

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
                  : 'شرکت‌ها و مالکانی که قطعه‌زمین در اختیار دارند را اضافه کنید تا فرم‌هایشان سامان بگیرد.'
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

      <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-[11.5px] text-fg-subtle">
        <span className="flex items-center gap-1.5">
          <Icon name="info" size={13} />
          کاربر می‌تواند بدون مجموعه باشد؛ اتصال‌ها را از «اتصال کاربران» هر مجموعه تغییر دهید.
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="clock" size={13} />
          آخرین تغییر:{' '}
          {audit.find((entry) => entry.entity === 'company')
            ? `${audit.find((entry) => entry.entity === 'company')?.entityLabel ?? ''} — ${formatRelative(
                audit.find((entry) => entry.entity === 'company')!.at,
              )}`
            : 'ثبت نشده'}
        </span>
      </div>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        size="lg"
        icon="building"
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
          const result = setCompanyMembers(membersFor.id, userIds);
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
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            const result = deleteCompany(pendingDelete.id);
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
