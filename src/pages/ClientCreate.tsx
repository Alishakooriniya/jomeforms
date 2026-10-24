import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientForm, emptyClientDraft } from '../components/clients/ClientForm';
import { PageHeader } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useToast } from '../store/ToastProvider';
import { useDbActions } from '../store/DataProvider';
import type { ClientDraft } from '../store/DataProvider';
import { formatCode } from '../lib/format';

export default function ClientCreate() {
  const { saveClient } = useDbActions();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const submit = (draft: ClientDraft) => {
    setSubmitting(true);
    const client = saveClient(draft);
    setSubmitting(false);
    toast.success('پرونده ثبت شد', `${client.fullName} — ${formatCode(client.code)}`);
    navigate(`/clients/${client.id}`, { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="ثبت پرونده جدید"
        subtitle="نام، کد ملی و موبایل را وارد کنید؛ بقیه اطلاعات اختیاری است."
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'پرونده‌ها', to: '/clients' }, { label: 'پرونده جدید' }]}
        actions={<Button variant="ghost" icon="arrowRight" to="/clients">بازگشت به پرونده‌ها</Button>}
      />
      <div className="card p-4 sm:p-5">
        <ClientForm
          initial={emptyClientDraft()}
          submitting={submitting}
          submitLabel="ثبت پرونده"
          onCancel={() => navigate('/clients')}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
