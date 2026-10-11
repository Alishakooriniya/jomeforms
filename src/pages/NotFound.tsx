/* صفحه ۴۰۴ */

import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="card w-full max-w-md">
        <EmptyState
          icon="alert"
          title="صفحه مورد نظر پیدا نشد"
          description="ممکن است نشانی تغییر کرده باشد یا این بخش برای نقش شما در دسترس نباشد."
          action={
            <div className="flex items-center gap-2">
              <Button to="/" variant="primary" icon="dashboard">
                بازگشت به داشبورد
              </Button>
              <Button to="/login" variant="ghost" icon="logout">
                صفحه ورود
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
