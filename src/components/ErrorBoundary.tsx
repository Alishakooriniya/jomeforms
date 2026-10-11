/* مرز خطا — اگر خطای پیش‌بینی‌نشده‌ای رخ دهد، به‌جای صفحه سفید پیام راهنما نشان می‌دهد */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // برای پیگیری در محیط توسعه؛ در نسخه سرور اینجا به سرویس ثبت خطا فرستاده می‌شود
    console.error('خطای پیش‌بینی‌نشده:', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="card w-full max-w-lg">
          <EmptyState
            icon="alert"
            title="خطای غیرمنتظره‌ای رخ داد"
            description="مشکل موقتی است. صفحه را دوباره بارگذاری کنید؛ در صورت تکرار، از تنظیمات فایل پشتیبان بگیرید و با پشتیبانی تماس بگیرید."
            action={
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
                    بارگذاری مجدد
                  </Button>
                  <Button variant="ghost" icon="dashboard" onClick={() => { window.location.href = '/'; }}>
                    بازگشت به داشبورد
                  </Button>
                </div>
                <code className="max-w-md overflow-x-auto rounded-field bg-card-2 px-3 py-2 text-[10.5px] text-fg-subtle" dir="ltr">
                  {error.message}
                </code>
              </div>
            }
          />
        </div>
      </div>
    );
  }
}
