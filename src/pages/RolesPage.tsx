/* نقش‌ها — بسته‌های دسترسی قابل استفاده مجدد برای کاربران */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PermissionRole } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, summarizePermissions } from '../data/permissions';
import { displayDigits, formatDate } from '../lib/format';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/Avatar';
import { TextInput } from '../components/ui/Field';
import { PermissionMatrix } from '../components/form/PermissionMatrix';

export default function RolesPage() {
  const { roles, users } = useDb();
  const { saveRole, deleteRole } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState<PermissionRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PermissionRole | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((user) => {
      if (user.role === 'superadmin') return;
      roles.forEach((role) => {
        const same =
          role.permissions.length === user.permissions.length &&
          role.permissions.every((permission) => user.permissions.includes(permission));
        if (same) map.set(role.id, (map.get(role.id) ?? 0) + 1);
      });
    });
    return map;
  }, [roles, users]);

  const openCreate = () => {
    setDraftName('');
    setDraftDescription('');
    setDraftPermissions([]);
    setCreating(true);
  };

  const openEdit = (role: PermissionRole) => {
    setDraftName(role.name);
    setDraftDescription(role.description ?? '');
    setDraftPermissions(role.permissions);
    setEditing(role);
  };

  const submit = () => {
    if (!draftName.trim()) {
      toast.error('نام نقش را وارد کنید');
      return;
    }
    const saved = saveRole(
      {
        name: draftName.trim(),
        description: draftDescription.trim() || undefined,
        permissions: draftPermissions,
        system: editing?.system,
      },
      editing?.id,
    );
    toast.success(editing ? 'نقش ویرایش شد' : 'نقش ساخته شد', saved.name);
    setCreating(false);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="نقش‌ها و دسترسی‌ها"
        subtitle="بسته‌های دسترسی آماده برای اعمال سریع روی مدیران"
        actions={
          <>
            <Button variant="secondary" icon="user-cog" onClick={() => navigate('/users')}>
              کاربران
            </Button>
            {can('roles.manage') ? (
              <Button variant="primary" icon="plus" onClick={openCreate}>
                نقش جدید
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => {
          const groupSummary = PERMISSION_GROUPS.map((group) => ({
            id: group.id,
            label: group.label,
            granted: group.perms.filter((permission) => role.permissions.includes(permission.key)).length,
            total: group.perms.length,
          })).filter((group) => group.granted > 0);

          return (
            <article key={role.id} className="card flex h-full flex-col gap-3 p-4 transition-colors hover:border-line-strong">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-[13px] font-semibold text-fg" title={role.name}>
                  {role.name}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {role.system ? (
                    <Badge tone="neutral" size="sm">
                      آماده سامانه
                    </Badge>
                  ) : null}
                  <Badge tone="brand" size="sm">
                    <span className="num">{displayDigits(role.permissions.length)}</span> دسترسی
                  </Badge>
                </div>
              </div>

              <p className="line-clamp-2 min-h-9 text-[11px] leading-5 text-fg-subtle">
                {role.description || 'بدون توضیح'}
              </p>

              <div className="flex flex-wrap gap-1">
                {groupSummary.map((group) => (
                  <span
                    key={group.id}
                    className="rounded-full bg-card-2 px-2 py-0.5 text-[10px] text-fg-muted"
                    title={`${group.granted} از ${group.total} دسترسی ${group.label}`}
                  >
                    {group.label} <span className="num">{displayDigits(group.granted)}</span>
                  </span>
                ))}
                {!groupSummary.length ? (
                  <span className="text-[11px] text-fg-subtle">بدون دسترسی</span>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="num text-[10.5px] text-fg-subtle">
                  {usage.get(role.id)
                    ? `${displayDigits(usage.get(role.id) ?? 0)} کاربر با همین دسترسی`
                    : `ساخته‌شده در ${formatDate(role.createdAt)}`}
                </span>
                <div className="flex items-center gap-1">
                  {can('roles.manage') ? (
                    <Button size="sm" variant="secondary" icon="edit" onClick={() => openEdit(role)}>
                      ویرایش
                    </Button>
                  ) : null}
                  {can('roles.manage') && !role.system ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      label="حذف نقش"
                      className="hover:text-danger-fg"
                      onClick={() => setPendingDelete(role)}
                    />
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!roles.length ? (
        <Card>
          <EmptyState
            icon="shield"
            title="نقشی ثبت نشده است"
            description="نقش جدید بسازید و دسترسی‌های آن را تعیین کنید تا اعمال روی کاربران سریع‌تر شود."
            action={
              can('roles.manage') ? (
                <Button variant="primary" icon="plus" onClick={openCreate}>
                  نقش جدید
                </Button>
              ) : null
            }
          />
        </Card>
      ) : null}

      {/* ساخت/ویرایش نقش */}
      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `ویرایش نقش ${editing.name}` : 'نقش جدید'}
        description="دسترسی‌های این نقش را انتخاب کنید؛ بعداً می‌توانید آن را روی هر کاربر اعمال کنید."
        icon="shield"
        size="xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              انصراف
            </Button>
            <Button variant="primary" icon="save" onClick={submit}>
              {editing ? 'ذخیره تغییرات' : 'ساخت نقش'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="نام نقش" required value={draftName} onChange={(event) => setDraftName(event.target.value)} />
            <TextInput
              label="خلاصه"
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="مثال: ثبت پرونده و ساخت سند"
            />
          </div>
          <p className="num text-[11px] text-fg-subtle">
            {summarizePermissions(draftPermissions, false)} — از {displayDigits(ALL_PERMISSIONS.length)} دسترسی ممکن
          </p>
          <PermissionMatrix value={draftPermissions} onChange={setDraftPermissions} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            const result = deleteRole(pendingDelete.id);
            if (result.ok) toast.success('نقش حذف شد', pendingDelete.name);
            else toast.error('حذف انجام نشد', result.error);
          }
          setPendingDelete(null);
        }}
        title="حذف نقش"
        description="این نقش حذف می‌شود؛ دسترسی کاربرانی که پیش‌تر این نقش را گرفته‌اند تغییر نمی‌کند."
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
