/* صفحه ورود — ساده و متمرکز: نام سازمان با خط نستعلیق و فرم ورود */

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useTheme } from '../store/ThemeProvider';
import { ORG_NAME } from '../config/org';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { FormActions } from '../components/ui/Controls';
import { useToast } from '../store/ToastProvider';

export default function Login() {
  const { login, user, ready } = useAuth();
  const toast = useToast();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-sm text-fg-muted">در حال بارگذاری…</div>;
  }
  if (user) return <Navigate to={from ?? '/'} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.ok) {
        toast.error(result.error ?? 'ورود ناموفق بود.');
        return;
      }
      toast.success('با موفقیت وارد شدید.');
      navigate(from ?? '/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg p-5">
      {/* هاله‌های محو سبز پس‌زمینه */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[780px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 end-[-8rem] h-96 w-96 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15"
      />

      <Button
        variant="ghost"
        size="icon"
        icon={theme.isDark ? 'sun' : 'moon'}
        label="تغییر پوسته"
        onClick={theme.toggleMode}
        className="absolute end-4 top-4"
      />

      <div className="relative w-full max-w-sm">
        <h1 className="nastaliq-font mb-8 text-center text-[30px] leading-[2.1] text-brand-700 dark:text-brand-400">
          {ORG_NAME}
        </h1>

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

            <FormActions className="border-0 pt-0">
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                ورود
              </Button>
            </FormActions>
          </div>
        </form>
      </div>
    </div>
  );
}
