import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../data/labels';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList } from '../components/ui/Card';
import { PageHeader } from '../components/ui/Avatar';
import { TextInput } from '../components/ui/Field';
import { useAuth } from '../store/AuthProvider';
import { authApi } from '../lib/apiClient';
import { useToast } from '../store/ToastProvider';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('رمز عبور جدید با تکرار آن یکسان نیست.');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success('رمز عبور تغییر کرد. برای امنیت، دوباره وارد شوید.');
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تغییر رمز عبور انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="پروفایل"
        subtitle="اطلاعات حساب کاربری و تنظیم رمز عبور"
        icon="user"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'پروفایل' }]}
      />

      <Card>
        <CardHeader title="اطلاعات حساب" icon="user" />
        <CardBody>
          <InfoList
            items={[
              { label: 'نام و نام خانوادگی', value: user.fullName },
              { label: 'نام کاربری', value: user.username },
              { label: 'نقش', value: ROLE_LABELS[user.role] },
              { label: 'عنوان', value: user.title },
              { label: 'شماره همراه', value: user.mobile },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="تغییر رمز عبور" subtitle="پس از تغییر رمز، نشست‌های قبلی بسته می‌شوند." icon="lock" />
        <CardBody>
          <form onSubmit={changePassword} className="flex max-w-xl flex-col gap-4">
            <TextInput
              label="رمز عبور فعلی"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
            <TextInput
              label="رمز عبور جدید"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              hint="حداقل ۸ نویسه"
            />
            <TextInput
              label="تکرار رمز عبور جدید"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
            <div>
              <Button type="submit" variant="primary" icon="lock" loading={saving}>
                ذخیره رمز عبور
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
