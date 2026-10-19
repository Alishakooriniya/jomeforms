import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientForm, emptyClientDraft } from '../components/clients/ClientForm';
import { PageHeader } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useToast } from '../store/ToastProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { ClientDraft } from '../store/DataProvider';
import { formatCode } from '../lib/format';

export default function ClientCreate() {
  const { settings } = useDb();
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
    <div className="flex flex-col gap-4">
      <PageHeader
        title="ثبت پرونده جدید"
        subtitle="مشخصات متقاضی و مسیر رسیدگی پرونده را ثبت کنید."
        icon="users"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'پرونده‌ها', to: '/clients' }, { label: 'پرونده جدید' }]}
        actions={<Button variant="ghost" icon="arrowRight" to="/clients">بازگشت به پرونده‌ها</Button>}
      />
      <div className="card p-4 sm:p-6">
        <ClientForm
          initial={emptyClientDraft(settings)}
          submitting={submitting}
          submitLabel="ثبت پرونده"
          configureWorkflow
          onCancel={() => navigate('/clients')}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
