/* صفحه ورود */

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DEMO_ACCOUNTS } from '../data/seed';
import { useAuth } from '../store/AuthProvider';
import { useDb } from '../store/DataProvider';
import { useTheme } from '../store/ThemeProvider';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { FormActions } from '../components/ui/Controls';

const FEATURES = [
  { icon: 'template' as const, title: 'تکمیل خودکار فرم‌ها', text: 'اطلاعات پرونده یک‌بار وارد می‌شود و در همه فرم‌ها جای‌گذاری می‌گردد.' },
  { icon: 'print' as const, title: 'چاپ و خروجی PDF', text: 'هر سند با قالب A4 آماده چاپ یا ذخیره به‌عنوان PDF است.' },
  { icon: 'scan' as const, title: 'بایگانی اسکن امضاشده', text: 'نسخه امضاشده اسکن و به پرونده پیوست می‌شود.' },
];

export default function Login() {
  const { login, user } = useAuth();
  const { settings } = useDb();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('super123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  if (user) return <Navigate to={from ?? '/'} replace />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = login(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'ورود ناموفق بود.');
      return;
    }
    navigate(from ?? '/', { replace: true });
  };

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1.05fr_1fr]">
      {/* پنل معرفی — در موبایل پنهان */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.25), transparent 40%)',
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[12px]">
            <Icon name="sparkles" size={14} />
            سامانه مدیریت پرونده‌های املاک
          </span>
          <h1 className="mt-6 text-2xl font-semibold leading-10">
            فرم‌های ملکی را یک‌بار پر کنید؛
            <br />
            بقیه کارها خودکار است.
          </h1>
          <p className="mt-4 max-w-md text-[13px] leading-6 text-white/80">
            ثبت اطلاعات مشتری، جای‌گذاری خودکار در قالب قراردادها، چاپ و خروجی PDF، و بایگانی نسخه اسکن‌شده امضاشده —
            همه در یک سامانه سبک و سریع.
          </p>
        </div>

        <ul className="relative mt-10 flex flex-col gap-4">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-white/15">
                <Icon name={feature.icon} size={17} />
              </span>
              <div>
                <p className="text-[13px] font-medium">{feature.title}</p>
                <p className="text-[11.5px] leading-5 text-white/70">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative text-[11px] text-white/60">{settings.orgLegalName} — نسخه دمو</p>
      </section>

      {/* فرم ورود */}
      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-card bg-brand-600 text-white">
                <Icon name="building" size={19} bold />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-fg">{settings.orgName}</p>
                <p className="text-[11px] text-fg-subtle">ورود به حساب کاربری</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              icon={theme.isDark ? 'sun' : 'moon'}
              label="تغییر پوسته"
              onClick={theme.toggleMode}
            />
          </div>

          <form className="card p-5" onSubmit={submit}>
            <div className="flex flex-col gap-4">
              <TextInput
                label="نام کاربری"
                value={username}
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                icon="user"
                placeholder="نام کاربری"
              />
              <TextInput
                label="رمز عبور"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                icon="lock"
                placeholder="••••••••"
              />

              {error ? (
                <p className="flex items-center gap-2 rounded-field bg-danger-soft px-3 py-2 text-[11.5px] text-danger-fg">
                  <Icon name="alert" size={14} />
                  {error}
                </p>
              ) : null}

              <FormActions className="border-0 pt-0">
                <Button type="submit" variant="primary" size="lg" fullWidth icon="logout" loading={loading}>
                  ورود به سامانه
                </Button>
              </FormActions>
            </div>
          </form>

          <div className="mt-4 rounded-card border border-line bg-card-2/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Icon name="info" size={13} />
              حساب‌های نمایشی — برای ورود سریع کلیک کنید
            </p>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                    setError('');
                  }}
                  className="flex items-center justify-between gap-2 rounded-field border border-line bg-card px-2.5 py-1.5 text-start text-[11.5px] transition-colors hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <span className="text-fg-muted">{account.label}</span>
                  <span className="num font-medium text-brand-700 dark:text-brand-300" dir="ltr">
                    {account.username} / {account.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
