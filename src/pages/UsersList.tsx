/* مدیریت کاربران (مدیران سامانه) — ویژه سوپرادمین */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, summarizePermissions } from '../data/permissions';
import { COMPANY_KIND_LABELS, ROLE_LABELS } from '../data/labels';
import { displayDigits, formatRelative } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Switch } from '../components/ui/Controls';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { FilterBar, FilterSelect, ResultsSummary, SearchInput } from '../components/ui/Toolbar';

export default function UsersList() {
  const { users, companies } = useDb();
  const { deleteUser, toggleUserActive, saveRole } = useDbActions();
  const { user: currentUser, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);

  const companyOf = (id?: string) => companies.find((company) => company.id === id);

  const query = useListQuery<User>(users, {
    search: (user) =>
      [user.fullName, user.username, user.title ?? '', user.mobile ?? '', companyOf(user.companyId)?.name ?? ''].join(
        ' ',
      ),
    filters: {
      role: (user, value) => user.role === value,
      state: (user, value) => (value === 'active' ? user.active : !user.active),
      company: (user, value) => (value === 'none' ? !user.companyId : user.companyId === value),
      permissionGroup: (user, value) => {
        if (value === 'all') return true;
        const group = PERMISSION_GROUPS.find((item) => item.id === value);
        if (!group) return true;
        if (user.role === 'superadmin') return true;
        return group.perms.some((permission) => user.permissions.includes(permission.key));
      },
      withoutPermissions: (user, value) => (value === 'yes' ? user.role !== 'superadmin' && user.permissions.length === 0 : true),
    },
    sorters: {
      fullName: (a, b) => compareText(a.fullName, b.fullName),
      username: (a, b) => compareText(a.username, b.username),
      permissions: (a, b) => a.permissions.length - b.permissions.length,
      lastLoginAt: (a, b) =>
        new Date(a.lastLoginAt ?? 0).getTime() - new Date(b.lastLoginAt ?? 0).getTime(),
    },
  });

  const columns: Array<Column<User>> = [
    {
      key: 'fullName',
      header: 'کاربر',
      sortable: true,
      cell: (user) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={user.fullName} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">
              {user.fullName}
              {user.id === currentUser?.id ? <span className="ms-1 text-[10.5px] text-fg-subtle">(شما)</span> : null}
            </p>
            <p className="num truncate text-[10.5px] text-fg-subtle" dir="ltr">
              {user.username}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'نقش',
      cell: (user) => (
        <div className="flex flex-col gap-1">
          <Badge tone={user.role === 'superadmin' ? 'brand' : 'neutral'} size="sm" icon={user.role === 'superadmin' ? 'shield' : undefined}>
            {ROLE_LABELS[user.role]}
          </Badge>
          {user.title ? <span className="text-[10.5px] text-fg-subtle">{user.title}</span> : null}
        </div>
      ),
    },
    {
      key: 'company',
      header: 'مجموعه',
      cell: (user) => {
        const company = companyOf(user.companyId);
        if (!company) return <span className="text-[11.5px] text-fg-subtle">بدون مجموعه</span>;
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[12px] text-fg">{company.name}</span>
            <span className="truncate text-[10.5px] text-fg-subtle">{COMPANY_KIND_LABELS[company.kind]}</span>
          </div>
        );
      },
      responsiveClass: 'hidden md:table-cell',
    },
    {
      key: 'permissions',
      header: 'دسترسی‌ها',
      sortable: true,
      cell: (user) => (
        <div className="flex flex-col gap-1">
          <span className="text-[11.5px] text-fg-muted">
            {summarizePermissions(user.permissions, user.role === 'superadmin')}
          </span>
          {user.role !== 'superadmin' ? (
            <span className="flex flex-wrap gap-1">
              {PERMISSION_GROUPS.filter((group) => group.perms.some((permission) => user.permissions.includes(permission.key)))
                .slice(0, 3)
                .map((group) => (
                  <span key={group.id} className="rounded-full bg-card-2 px-1.5 py-0.5 text-[9.5px] text-fg-subtle">
                    {group.label}
                  </span>
                ))}
              {PERMISSION_GROUPS.filter((group) => group.perms.some((permission) => user.permissions.includes(permission.key)))
                .length > 3 ? (
                <span className="rounded-full bg-card-2 px-1.5 py-0.5 text-[9.5px] text-fg-subtle">
                  +{displayDigits(
                    PERMISSION_GROUPS.filter((group) =>
                      group.perms.some((permission) => user.permissions.includes(permission.key)),
                    ).length - 3,
                  )}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      ),
      responsiveClass: 'hidden lg:table-cell',
    },
    {
      key: 'lastLoginAt',
      header: 'آخرین ورود',
      sortable: true,
      cell: (user) => (
        <span className="text-[11.5px] text-fg-muted">
          {user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'ورود نداشته'}
        </span>
      ),
      responsiveClass: 'hidden xl:table-cell',
    },
    {
      key: 'active',
      header: 'وضعیت',
      align: 'center',
      cell: (user) => (
        <div className="flex items-center justify-center gap-2">
          <Switch
            checked={user.active}
            disabled={!can('users.edit') || user.id === currentUser?.id}
            onChange={() => {
              toggleUserActive(user.id);
              toast.success(user.active ? 'کاربر غیرفعال شد' : 'کاربر فعال شد', user.fullName);
            }}
            id={`active-${user.id}`}
          />
          <span className="text-[11px] text-fg-muted">{user.active ? 'فعال' : 'غیرفعال'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (user) => (
        <Dropdown
          label="عملیات کاربر"
          items={[
            ...(can('users.edit')
              ? [
                  {
                    id: 'edit',
                    label: 'ویرایش و دسترسی‌ها',
                    icon: 'user-cog' as const,
                    onSelect: () => navigate(`/users/${user.id}`),
                  },
                ]
              : []),
            ...(can('roles.manage')
              ? [
                  {
                    id: 'save-role',
                    label: 'ذخیره دسترسی‌ها به‌عنوان نقش',
                    icon: 'shield' as const,
                    disabled: user.role === 'superadmin' || !user.permissions.length,
                    onSelect: () => {
                      const name = window.prompt('نام نقش جدید:', `${user.fullName} — الگو`);
                      if (!name) return;
                      saveRole({ name, description: `برگرفته از دسترسی‌های ${user.fullName}`, permissions: user.permissions });
                      toast.success('نقش ساخته شد', name);
                    },
                  },
                ]
              : []),
            ...(can('users.delete') && user.id !== currentUser?.id
              ? [
                  { id: 'sep', label: '', separator: true, onSelect: () => {} },
                  {
                    id: 'delete',
                    label: 'حذف کاربر',
                    icon: 'trash' as const,
                    danger: true,
                    onSelect: () => setPendingDelete(user),
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
        title="کاربران سامانه"
        subtitle="افزودن مدیر، تعیین دسترسی دقیق و فعال/غیرفعال‌کردن حساب‌ها"
        icon="user-cog"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'کاربران' }]}
        actions={
          <>
            {can('roles.view') ? (
              <Button variant="secondary" icon="shield" to="/roles">
                نقش‌ها
              </Button>
            ) : null}
            {can('users.create') ? (
              <Button variant="primary" icon="plus" to="/users/new">
                افزودن کاربر
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar actions={<ResultsSummary total={query.total} unit="کاربر" />}>
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="جستجوی نام، نام کاربری، سمت…"
          className="w-full sm:w-64"
        />
        <FilterSelect
          value={query.filters.role ?? 'all'}
          onChange={(value) => query.setFilter('role', value)}
          options={[
            { value: 'superadmin', label: 'مدیر ارشد' },
            { value: 'admin', label: 'مدیر' },
          ]}
          placeholder="همه نقش‌ها"
          icon="filter"
        />
        <FilterSelect
          value={query.filters.permissionGroup ?? 'all'}
          onChange={(value) => query.setFilter('permissionGroup', value)}
          options={PERMISSION_GROUPS.map((group) => ({ value: group.id, label: `دسترسی ${group.label}` }))}
          placeholder="دسترسی به بخش…"
        />
        <FilterSelect
          value={query.filters.company ?? 'all'}
          onChange={(value) => query.setFilter('company', value)}
          options={[
            { value: 'none', label: 'بدون مجموعه' },
            ...companies.map((company) => ({ value: company.id, label: company.name })),
          ]}
          placeholder="همه مجموعه‌ها"
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
          rowKey={(user) => user.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          empty={
            <EmptyState
              icon="user-cog"
              title={query.hasActiveFilters ? 'کاربری با این فیلترها پیدا نشد' : 'کاربری ثبت نشده است'}
              description={
                query.hasActiveFilters
                  ? 'فیلترها را تغییر دهید.'
                  : 'برای همکاری همکاران، حساب کاربری بسازید و دسترسی هرکدام را تعیین کنید.'
              }
              action={
                can('users.create') ? (
                  <Button variant="primary" icon="plus" to="/users/new">
                    افزودن کاربر
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

      <div className="card flex flex-wrap items-center gap-3 p-3 text-[11.5px] text-fg-subtle">
        <span className="flex items-center gap-1.5">
          <Icon name="info" size={13} />
          {displayDigits(ALL_PERMISSIONS.length)} دسترسی در {displayDigits(PERMISSION_GROUPS.length)} بخش قابل تنظیم است.
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="shield" size={13} />
          {displayDigits(users.filter((user) => user.role === 'superadmin').length)} مدیر ارشد •{' '}
          {displayDigits(users.filter((user) => user.role === 'admin').length)} مدیر
        </span>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            const result = deleteUser(pendingDelete.id);
            if (result.ok) toast.success('کاربر حذف شد', pendingDelete.fullName);
            else toast.error('حذف انجام نشد', result.error);
          }
          setPendingDelete(null);
        }}
        title="حذف کاربر"
        description={
          <>
            حساب <b className="text-fg">{pendingDelete?.fullName}</b> حذف می‌شود و دیگر نمی‌تواند وارد شود. سوابق فعالیت
            او در گزارش‌ها باقی می‌ماند.
          </>
        }
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}