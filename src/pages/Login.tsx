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
  const { login, user, ready, serverMode } = useAuth();
  const { settings } = useDb();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(serverMode ? '' : 'superadmin');
  const [password, setPassword] = useState(serverMode ? '' : 'super123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-sm text-fg-muted">در حال بارگذاری…</div>;
  }
  if (user) return <Navigate to={from ?? '/'} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(username, password);
      if (!result.ok) {
        setError(result.error ?? 'ورود ناموفق بود.');
        return;
      }
      navigate(from ?? '/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1.05fr_1fr]">
      {/* پنل معرفی — در موبایل پنهان */}
      <section className="hidden flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
        <div className="relative">
          <span dir="ltr" className="inline-flex items-center gap-2 text-lg font-bold">
            <Icon name="building" size={21} />
            Jome Forms
          </span>
          <h1 className="mt-8 text-3xl font-semibold leading-[1.7]">
            فرم‌های ملکی را یک‌بار پر کنید؛
            <br />
            بقیه کارها خودکار است.
          </h1>
          <p className="mt-5 max-w-md text-base leading-8 text-white/90">
            ثبت اطلاعات مشتری، جای‌گذاری خودکار در قالب قراردادها، چاپ و خروجی PDF، و بایگانی نسخه اسکن‌شده امضاشده —
            همه در یک سامانه سبک و سریع.
          </p>
        </div>

        <ul className="relative mt-10 flex flex-col gap-4">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-white/30">
                <Icon name={feature.icon} size={17} />
              </span>
              <div>
                <p className="text-[15px] font-medium">{feature.title}</p>
                <p className="text-[13px] leading-6 text-white/85">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative text-[12px] text-white/75">{settings.orgLegalName} — نسخه دمو</p>
      </section>

      {/* فرم ورود */}
      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-brand-600 text-white">
                <Icon name="building" size={19} bold />
              </span>
              <div>
                <p dir="ltr" className="w-fit text-[17px] font-bold text-fg">Jome Forms</p>
                <p className="text-[13px] text-fg-muted">{settings.orgName} · ورود به حساب</p>
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
                <p className="flex items-center gap-2 rounded-field bg-danger-soft px-3 py-2 text-[13px] text-danger-fg">
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

          {serverMode ? null : (
          <div className="mt-4 rounded-card border border-line bg-card-2/60 p-4">
            <p className="mb-3 flex items-center gap-2 text-[13px] text-fg-muted">
              <Icon name="info" size={15} />
              حساب‌های نمایشی — برای ورود سریع کلیک کنید
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                    setError('');
                  }}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-field border border-line bg-card px-3 py-2 text-start text-[13px] transition-colors hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <span className="text-fg-muted">{account.label}</span>
                  <span className="num font-medium text-brand-700 dark:text-brand-300" dir="ltr">
                    {account.username} / {account.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
