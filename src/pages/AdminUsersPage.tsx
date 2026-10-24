import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuditEntry } from '../types';
import { api } from '../lib/apiClient';
import type { ApiUser } from '../lib/apiClient';
import type { AdminUserInput, AdminUserPatch } from '../lib/apiClient';
import { displayDigits, formatDate } from '../lib/format';
import { PERMISSION_GROUPS } from '../data/permissions';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '../components/ui/Card';
import { Checkbox } from '../components/ui/Controls';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
import { TextInput } from '../components/ui/Field';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { useToast } from '../store/ToastProvider';

interface PermissionItem {
  key: string;
  group: string;
  label: string;
}

interface Draft {
  username: string;
  fullName: string;
  password: string;
  title: string;
  mobile: string;
  permissions: string[];
}

const EMPTY_DRAFT: Draft = {
  username: '',
  fullName: '',
  password: '',
  title: '',
  mobile: '',
  permissions: [],
};

type PendingAction = { user: ApiUser; kind: 'activate' | 'deactivate' | 'delete' };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'عملیات با خطا روبه‌رو شد.';
}

export default function AdminUsersPage() {
  const toast = useToast();
  const [admins, setAdmins] = useState<ApiUser[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [activityUser, setActivityUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const loadAdmins = useCallback(async () => {
    const result = await api.adminUsers.list({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' });
    setAdmins(result.items);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.adminUsers.list({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
      api.permissions.list(),
    ])
      .then(([adminResult, permissionResult]) => {
        if (!mounted) return;
        setAdmins(adminResult.items);
        setPermissions(permissionResult);
      })
      .catch((error: unknown) => toast.error(errorMessage(error)))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  const activeCount = useMemo(() => admins.filter((admin) => admin.active).length, [admins]);

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  };

  const openEdit = (admin: ApiUser) => {
    setEditing(admin);
    setDraft({
      username: admin.username,
      fullName: admin.fullName,
      password: '',
      title: admin.title ?? '',
      mobile: admin.mobile ?? '',
      permissions: admin.permissions.filter((key) => key !== '*'),
    });
    setEditorOpen(true);
  };

  const loadActivity = async (admin: ApiUser) => {
    setActivityUser(admin);
    setActivities([]);
    try {
      const result = await api.audit.list({
        userId: admin.id,
        limit: 100,
        sortBy: 'at',
        sortOrder: 'desc',
      });
      setActivities(result.items);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const patch: AdminUserPatch = {
          username: draft.username.trim(),
          fullName: draft.fullName.trim(),
          title: draft.title.trim() || undefined,
          mobile: draft.mobile.trim() || undefined,
          permissions: draft.permissions,
          ...(draft.password ? { password: draft.password } : {}),
        };
        await api.adminUsers.update(editing.id, patch);
      } else {
        const input: AdminUserInput = {
          username: draft.username.trim(),
          fullName: draft.fullName.trim(),
          password: draft.password,
          title: draft.title.trim() || undefined,
          mobile: draft.mobile.trim() || undefined,
          permissions: draft.permissions,
        };
        await api.adminUsers.create(input);
      }
      toast.success(editing ? 'اطلاعات مدیر به‌روزرسانی شد.' : 'حساب مدیر ساخته شد.');
      setEditorOpen(false);
      await loadAdmins();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const performAction = async () => {
    if (!pendingAction) return;
    const { user, kind } = pendingAction;
    setSaving(true);
    try {
      if (kind === 'delete') {
        await api.adminUsers.remove(user.id);
        toast.success('حساب مدیر حذف شد.');
        if (activityUser?.id === user.id) {
          setActivityUser(null);
          setActivities([]);
        }
      } else {
        await api.adminUsers.setActive(user.id, kind === 'activate');
        toast.success(kind === 'activate' ? 'حساب مدیر فعال شد.' : 'حساب مدیر غیرفعال شد.');
      }
      setPendingAction(null);
      await loadAdmins();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: Array<Column<ApiUser>> = [
    {
      key: 'manager',
      header: 'مدیر',
      sticky: true,
      cell: (admin) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={admin.fullName} size={26} />
          <span className="truncate font-medium text-fg" title={`${admin.fullName} — ${admin.username}`}>
            {admin.fullName}
          </span>
          <span dir="ltr" className="num shrink-0 text-[10px] text-fg-subtle">
            {admin.username}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      cell: (admin) => (
        <Badge tone={admin.active ? 'success' : 'neutral'} size="sm" dot>
          {admin.active ? 'فعال' : 'غیرفعال'}
        </Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'آخرین ورود',
      cell: (admin) => (
        <span className="num text-[11px] text-fg-subtle">
          {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'هنوز وارد نشده'}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: 'دسترسی',
      cell: (admin) => (
        <span className="num text-fg-muted">
          {displayDigits(admin.permissions.filter((permission) => permission !== '*').length)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      widthClassName: 'w-12',
      cell: (admin) => (
        <Dropdown
          label="عملیات مدیر"
          items={[
            { id: 'activity', label: 'مشاهده عملکرد', icon: 'history', onSelect: () => void loadActivity(admin) },
            { id: 'edit', label: 'ویرایش و دسترسی‌ها', icon: 'edit', onSelect: () => openEdit(admin) },
            {
              id: 'toggle',
              label: admin.active ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب',
              icon: admin.active ? 'lock' : 'check',
              onSelect: () => setPendingAction({ user: admin, kind: admin.active ? 'deactivate' : 'activate' }),
            },
            { id: 'sep', label: '', separator: true, onSelect: () => {} },
            {
              id: 'delete',
              label: 'حذف دائمی',
              icon: 'trash',
              danger: true,
              onSelect: () => setPendingAction({ user: admin, kind: 'delete' }),
            },
          ]}
        />
      ),
    },
  ];

  const groupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>((groups, permission) => {
    (groups[permission.group] ??= []).push(permission);
    return groups;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="مدیریت مدیران"
        subtitle="حساب مدیران، دسترسی‌ها و سابقه فعالیت"
        actions={<Button variant="primary" icon="plus" onClick={openCreate}>مدیر جدید</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="تعداد مدیران" value={displayDigits(admins.length)} icon="users" />
        <StatCard label="مدیران فعال" value={displayDigits(activeCount)} icon="check" tone="success" />
      </div>

      <Card>
        <CardHeader title="حساب‌های مدیر" subtitle="مدیریت حساب‌های دارای نقش مدیر" icon="user-cog" />
        <CardBody className="p-0">
          <DataTable
            rows={admins}
            columns={columns}
            rowKey={(admin) => admin.id}
            loading={loading}
            empty={<EmptyState title="هنوز حساب مدیری ساخته نشده است." icon="users" />}
          />
        </CardBody>
      </Card>

      {activityUser ? (
        <Card>
          <CardHeader
            title={`عملکرد ${activityUser.fullName}`}
            subtitle="ورود، خروج و تغییراتی که این مدیر ثبت کرده است"
            icon="history"
            action={<Button size="sm" variant="ghost" icon="close" label="بستن گزارش" onClick={() => setActivityUser(null)} />}
          />
          <CardBody className="p-0">
            <DataTable
              rows={activities}
              columns={[
                { key: 'at', header: 'زمان', cell: (entry) => formatDate(entry.at) },
                { key: 'action', header: 'عملیات', cell: (entry) => entry.action },
                { key: 'entity', header: 'بخش', cell: (entry) => entry.entityLabel ?? entry.entity },
                { key: 'detail', header: 'جزئیات', cell: (entry) => entry.detail ?? '—' },
              ]}
              rowKey={(entry) => entry.id}
              empty={<EmptyState title="فعالیتی برای این مدیر ثبت نشده است." icon="history" />}
            />
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'ویرایش مدیر' : 'ساخت حساب مدیر'}
        description="دسترسی‌ها را فقط به بخش‌های موردنیاز اختصاص دهید."
        icon="user-cog"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={saving}>انصراف</Button>
            <Button variant="primary" type="submit" form="admin-user-form" loading={saving}>
              {editing ? 'ذخیره تغییرات' : 'ساخت مدیر'}
            </Button>
          </>
        }
      >
        <form id="admin-user-form" onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="نام و نام خانوادگی"
              value={draft.fullName}
              onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
              minLength={2}
              required
            />
            <TextInput
              label="نام کاربری"
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
              minLength={3}
              required
            />
            <TextInput
              label={editing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
              type="password"
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              minLength={8}
              required={!editing}
              autoComplete="new-password"
              hint={editing ? 'برای نگه‌داشتن رمز فعلی خالی بگذارید.' : 'حداقل ۸ نویسه'}
            />
            <TextInput
              label="عنوان شغلی"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <TextInput
              label="شماره همراه"
              value={draft.mobile}
              onChange={(event) => setDraft({ ...draft, mobile: event.target.value })}
              dir="ltr"
            />
          </div>

          <section className="flex flex-col gap-3 border-t border-line pt-4">
            <div>
              <h3 className="text-[14px] font-semibold text-fg">دسترسی‌های مدیر</h3>
              <p className="mt-1 text-[12px] text-fg-muted">دسترسی‌های انتخاب‌شده بلافاصله روی API اعمال می‌شوند.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groupedPermissions).map(([group, items]) => (
                <fieldset key={group} className="rounded-card border border-line p-3">
                  <legend className="px-1 text-[13px] font-medium text-fg">
                    {PERMISSION_GROUPS.find((item) => item.id === group)?.label ?? group}
                  </legend>
                  <div className="flex flex-col gap-2 pt-1">
                    {items.map((permission) => (
                      <Checkbox
                        key={permission.key}
                        label={permission.label}
                        checked={draft.permissions.includes(permission.key)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...draft.permissions, permission.key]
                            : draft.permissions.filter((key) => key !== permission.key);
                          setDraft({ ...draft, permissions: next });
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void performAction()}
        title={
          pendingAction?.kind === 'delete'
            ? 'حذف دائمی مدیر'
            : pendingAction?.kind === 'deactivate'
              ? 'غیرفعال‌سازی مدیر'
              : 'فعال‌سازی مدیر'
        }
        description={
          pendingAction?.kind === 'delete'
            ? `حساب «${pendingAction.user.fullName}» و دسترسی ورود آن برای همیشه حذف می‌شود. این کار قابل بازگشت نیست.`
            : pendingAction?.kind === 'deactivate'
              ? `حساب «${pendingAction.user.fullName}» غیرفعال می‌شود و نشست‌های فعالش پایان می‌یابد.`
              : `حساب «${pendingAction?.user.fullName}» دوباره فعال می‌شود.`
        }
        confirmLabel={pendingAction?.kind === 'delete' ? 'حذف دائمی' : 'تأیید'}
        variant={pendingAction?.kind === 'delete' ? 'danger' : 'primary'}
        loading={saving}
      />
    </div>
  );
}
