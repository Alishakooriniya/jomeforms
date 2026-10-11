/* ساخت و ویرایش کاربر + تعیین دسترسی (کاملاً سفارشی) */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RoleId } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { UserDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, summarizePermissions } from '../data/permissions';
import { ROLE_LABELS } from '../data/labels';
import { suggestPassword } from '../lib/crypto';
import { displayDigits, formatDate } from '../lib/format';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList } from '../components/ui/Card';
import { FormGrid, Switch } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Select, TextInput, Textarea } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { PermissionMatrix } from '../components/form/PermissionMatrix';

export default function UserEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { users, roles, audit, companies } = useDb();
  const { saveUser } = useDbActions();
  const { user: currentUser, can } = useAuth();
  const toast = useToast();

  const existing = id ? users.find((item) => item.id === id) : undefined;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserDraft>(() => ({
    username: existing?.username ?? '',
    fullName: existing?.fullName ?? '',
    role: existing?.role ?? 'admin',
    permissions: existing?.permissions.filter((permission) => permission !== '*') ?? [],
    title: existing?.title ?? '',
    mobile: existing?.mobile ?? '',
    companyId: existing?.companyId ?? '',
    active: existing?.active ?? true,
    note: existing?.note ?? '',
    password: '',
  }));

  const set = <K extends keyof UserDraft>(key: K, value: UserDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isSuperadminRole = form.role === 'superadmin';
  const userAudit = useMemo(
    () => (existing ? audit.filter((entry) => entry.entityId === existing.id).slice(0, 10) : []),
    [audit, existing],
  );

  if (id && !existing) {
    return (
      <div className="card">
        <EmptyState
          icon="alert"
          title="کاربر پیدا نشد"
          action={
            <Button to="/users" variant="primary" icon="user-cog">
              بازگشت به فهرست کاربران
            </Button>
          }
        />
      </div>
    );
  }

  const submit = () => {
    if (!form.fullName.trim()) return toast.error('نام و نام خانوادگی را وارد کنید.');
    if (!form.username.trim()) return toast.error('نام کاربری را وارد کنید.');
    if (!existing && !form.password) return toast.error('برای کاربر جدید رمز عبور تعیین کنید.');

    const result = saveUser(
      {
        ...form,
        username: form.username.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        companyId: form.companyId || undefined,
        permissions: isSuperadminRole ? ['*'] : form.permissions,
      },
      existing?.id,
    );

    if (!result.ok) {
      toast.error('ذخیره نشد', result.error);
      return;
    }
    toast.success(existing ? 'کاربر به‌روزرسانی شد' : 'کاربر ساخته شد', result.user?.fullName);
    navigate('/users');
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={existing ? `ویرایش کاربر: ${existing.fullName}` : 'افزودن کاربر جدید'}
        subtitle="نقش، رمز عبور و دسترسی‌های دقیق این کاربر را تعیین کنید."
        icon="user-cog"
        breadcrumbs={[
          { label: 'داشبورد', to: '/' },
          { label: 'کاربران', to: '/users' },
          { label: existing ? existing.fullName : 'کاربر جدید' },
        ]}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/users')}>
              بازگشت
            </Button>
            <Button variant="primary" icon="save" onClick={submit}>
              {existing ? 'ذخیره تغییرات' : 'ساخت کاربر'}
            </Button>
          </>
        }
      />

      {existing && existing.id === currentUser?.id ? (
        <p className="flex items-center gap-2 rounded-card border border-line bg-info-soft px-3 py-2 text-[12px] text-info-fg">
          <Icon name="info" size={14} />
          در حال ویرایش حساب خودتان هستید؛ تغییر دسترسی‌ها بلافاصله اعمال می‌شود.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="اطلاعات کاربر" icon="user" />
            <CardBody>
              <FormGrid columns={2}>
                <TextInput
                  label="نام و نام خانوادگی"
                  required
                  value={form.fullName}
                  onChange={(event) => set('fullName', event.target.value)}
                />
                <TextInput
                  label="نام کاربری"
                  required
                  dir="ltr"
                  value={form.username}
                  hint="برای ورود استفاده می‌شود؛ فقط حروف انگلیسی و عدد"
                  onChange={(event) => set('username', event.target.value.replace(/\s/g, ''))}
                />
                <Select
                  label="نقش سامانه"
                  value={form.role}
                  disabled={existing?.role === 'superadmin' && users.filter((user) => user.role === 'superadmin').length === 1}
                  options={[
                    { value: 'admin', label: 'مدیر (دسترسی بر اساس مجوزها)' },
                    { value: 'superadmin', label: 'مدیر ارشد (دسترسی کامل)' },
                  ]}
                  onChange={(event) => set('role', event.target.value as RoleId)}
                  hint={
                    existing?.role === 'superadmin' && users.filter((user) => user.role === 'superadmin').length === 1
                      ? 'آخرین مدیر ارشد قابل تغییر نقش نیست'
                      : 'مدیر ارشد به همه بخش‌ها دسترسی دارد'
                  }
                />
                <TextInput
                  label="سمت سازمانی"
                  value={form.title ?? ''}
                  placeholder="مثال: کارشناس قرارداد"
                  onChange={(event) => set('title', event.target.value)}
                />
                <TextInput
                  label="شماره موبایل"
                  value={form.mobile ?? ''}
                  inputMode="tel"
                  onChange={(event) => set('mobile', event.target.value)}
                />
                <Select
                  label="مجموعه"
                  value={form.companyId ?? ''}
                  disabled={!can('companies.assign')}
                  options={companies.map((company) => ({ value: company.id, label: company.name }))}
                  placeholder="بدون مجموعه"
                  onChange={(event) => set('companyId', event.target.value || undefined)}
                  hint={
                    can('companies.assign')
                      ? 'کاربر می‌تواند بدون مجموعه باشد'
                      : 'برای تعیین مجموعه به دسترسی «اتصال کاربران به مجموعه» نیاز است'
                  }
                />
                <div className="flex items-end gap-3">
                  <TextInput
                    label={existing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={form.password ?? ''}
                    hint={existing ? 'برای تغییر رمز پر کنید' : 'حداقل ۶ کاراکتر'}
                    onChange={(event) => set('password', event.target.value)}
                    containerClassName="flex-1"
                  />
                  <Button
                    variant="secondary"
                    icon={showPassword ? 'eye' : 'lock'}
                    label={showPassword ? 'پنهان‌کردن رمز' : 'نمایش رمز'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  />
                  <Button
                    variant="secondary"
                    icon="sparkles"
                    label="تولید رمز تصادفی"
                    onClick={() => {
                      set('password', suggestPassword(10));
                      setShowPassword(true);
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Switch
                    checked={form.active}
                    label="حساب فعال باشد"
                    hint="حساب غیرفعال اجازه ورود ندارد"
                    onChange={(checked) => set('active', checked)}
                    id="user-active"
                  />
                </div>
                <Textarea
                  label="یادداشت داخلی"
                  containerClassName="md:col-span-2"
                  className="min-h-16"
                  value={form.note ?? ''}
                  onChange={(event) => set('note', event.target.value)}
                />
              </FormGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="دسترسی‌ها"
              subtitle="هر تیک یعنی این کاربر به آن عملیات دسترسی دارد"
              icon="shield"
              action={
                <Badge tone={isSuperadminRole ? 'brand' : 'neutral'}>
                  {summarizePermissions(form.permissions, isSuperadminRole)}
                </Badge>
              }
            />
            <CardBody className="flex flex-col gap-4">
              {isSuperadminRole ? (
                <p className="flex items-center gap-2 rounded-field bg-brand-50 px-3 py-2.5 text-[12px] text-brand-700 dark:bg-brand-500/12 dark:text-brand-300">
                  <Icon name="shield" size={14} />
                  مدیر ارشد به‌صورت پیش‌فرض به همه بخش‌ها و تنظیمات دسترسی دارد.
                </p>
              ) : null}

              {!isSuperadminRole && roles.length ? (
                <div className="flex flex-wrap items-center gap-2 rounded-field bg-card-2 p-2.5">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
                    <Icon name="template" size={13} />
                    اعمال نقش آماده:
                  </span>
                  {roles.map((role) => (
                    <Button
                      key={role.id}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        set('permissions', role.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission)));
                        toast.info('نقش اعمال شد', `${role.name} — قابل ویرایش است`);
                      }}
                    >
                      {role.name}
                      <span className="num text-[10px] opacity-70">{displayDigits(role.permissions.length)}</span>
                    </Button>
                  ))}
                </div>
              ) : null}

              <PermissionMatrix
                value={form.permissions}
                disabled={isSuperadminRole || (Boolean(existing) && !can('users.edit'))}
                onChange={(permissions) => set('permissions', permissions)}
              />
            </CardBody>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="خلاصه کاربر" icon="clipboard" />
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={form.fullName || 'کاربر'} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-fg">{form.fullName || 'بدون نام'}</p>
                  <p className="num truncate text-[11px] text-fg-subtle" dir="ltr">
                    {form.username || 'username'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={form.role === 'superadmin' ? 'brand' : 'neutral'} size="sm">
                  {ROLE_LABELS[form.role]}
                </Badge>
                <Badge tone={form.active ? 'success' : 'neutral'} size="sm" dot>
                  {form.active ? 'فعال' : 'غیرفعال'}
                </Badge>
                {form.title ? (
                  <Badge tone="info" size="sm">
                    {form.title}
                  </Badge>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                <p className="text-[11px] text-fg-subtle">دسترسی به بخش‌ها</p>
                <ul className="flex flex-col gap-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const granted = isSuperadminRole
                      ? group.perms.length
                      : group.perms.filter((permission) => form.permissions.includes(permission.key)).length;
                    const full = granted === group.perms.length;
                    return (
                      <li key={group.id} className="flex items-center gap-2 text-[11.5px]">
                        <Icon
                          name={granted ? (full ? 'check' : 'refresh') : 'close'}
                          size={13}
                          className={granted ? (full ? 'text-success' : 'text-warn') : 'text-fg-subtle'}
                        />
                        <span className={granted ? 'text-fg' : 'text-fg-subtle'}>{group.label}</span>
                        <span className="num ms-auto text-[10.5px] text-fg-subtle">
                          {displayDigits(granted)}/{displayDigits(group.perms.length)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardBody>
          </Card>

          {existing ? (
            <Card>
              <CardHeader title="اطلاعات حساب" icon="info" />
              <CardBody>
                <InfoList
                  items={[
                    { label: 'تاریخ ایجاد', value: formatDate(existing.createdAt, 'long'), icon: 'calendar' },
                    { label: 'آخرین ورود', value: existing.lastLoginAt ? formatDate(existing.lastLoginAt, 'datetime') : 'ندارد', icon: 'clock' },
                    { label: 'آخرین ویرایش', value: existing.updatedAt ? formatDate(existing.updatedAt, 'datetime') : '—' },
                    { label: 'شناسه', value: existing.id },
                  ]}
                  columns={1}
                />
              </CardBody>
            </Card>
          ) : null}

          {existing ? (
            <Card>
              <CardHeader title="فعالیت این کاربر" icon="history" />
              <CardBody className="p-0">
                {userAudit.length ? (
                  <ul className="divide-y divide-line">
                    {userAudit.map((entry) => (
                      <li key={entry.id} className="px-3 py-2">
                        <p className="text-[11.5px] text-fg">{entry.action}</p>
                        <p className="num text-[10.5px] text-fg-subtle">{formatDate(entry.at, 'datetime')}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact icon="history" title="فعالیتی ثبت نشده است" />
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
