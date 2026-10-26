/* ساخت و ویرایش کاربر + تعیین دسترسی (کاملاً سفارشی) */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { UserDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { ALL_PERMISSIONS, summarizePermissions } from '../data/permissions';
import { suggestPassword } from '../lib/crypto';
import { formatDate } from '../lib/format';
import { PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList } from '../components/ui/Card';
import { FormGrid, Switch } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { TextInput } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { PermissionMatrix } from '../components/form/PermissionMatrix';

export default function UserEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { users, audit } = useDb();
  const { saveUser } = useDbActions();
  const { user: currentUser, can } = useAuth();
  const toast = useToast();

  const existing = id ? users.find((item) => item.id === id) : undefined;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserDraft>(() => ({
    username: existing?.username ?? '',
    fullName: existing?.fullName ?? '',
    role: existing?.role ?? 'admin',
    // کاربر جدید به‌صورت پیش‌فرض اجازه استفاده از سربرگ را دارد؛ مدیر می‌تواند بگیرد
    permissions:
      existing?.permissions.filter((permission) => permission !== '*' && ALL_PERMISSIONS.includes(permission)) ??
      ['letterhead.view'],
    mobile: existing?.mobile ?? '',
    active: existing?.active ?? true,
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

  const submit = async () => {
    if (!form.fullName.trim()) return toast.error('نام و نام خانوادگی را وارد کنید.');
    if (!form.username.trim()) return toast.error('نام کاربری را وارد کنید.');
    if (!existing && !form.password) return toast.error('برای کاربر جدید رمز عبور تعیین کنید.');

    const result = await saveUser(
      {
        ...form,
        username: form.username.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        mobile: form.mobile?.trim(),
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
        subtitle="مشخصات، رمز عبور و دسترسی‌های دقیق این کاربر را تعیین کنید."
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
            <Button variant="primary" icon="save" onClick={() => void submit()}>
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
            <TextInput
              label="شماره موبایل"
              dir="ltr"
              value={form.mobile ?? ''}
              inputMode="tel"
              placeholder="09xxxxxxxxx"
              onChange={(event) => set('mobile', event.target.value)}
            />
            <div className="flex items-end gap-2">
              <TextInput
                label={existing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={form.password ?? ''}
                hint={existing ? 'برای تغییر رمز پر کنید' : 'حداقل ۸ کاراکتر'}
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
                disabled={existing?.role === 'superadmin'}
                label="حساب فعال باشد"
                hint={
                  existing?.role === 'superadmin'
                    ? 'حساب مدیر ارشد همیشه فعال است'
                    : 'حساب غیرفعال اجازه ورود ندارد'
                }
                onChange={(checked) => set('active', checked)}
                id="user-active"
              />
            </div>
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

          <PermissionMatrix
            value={form.permissions}
            disabled={isSuperadminRole || (Boolean(existing) && !can('users.edit'))}
            onChange={(permissions) => set('permissions', permissions)}
          />
        </CardBody>
      </Card>

      {existing ? (
        <div className="grid gap-4 lg:grid-cols-2">
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
        </div>
      ) : null}
    </div>
  );
}
