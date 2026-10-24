/* داشبورد — کارهای نیازمند اقدام، نمای سریع پرونده‌ها و فعالیت اخیر.
   اصل طراحی: ابتدا «چه کاری باید انجام دهم؟»، بعد آمار و در پایان تاریخچه. */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useDb } from '../store/DataProvider';
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, CLIENT_CASE_TYPE_LABELS } from '../data/labels';
import { displayDigits, formatCode, formatDate, formatRelative } from '../lib/format';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';

interface ActionItem {
  id: string;
  title: string;
  meta: string;
  to: string;
  kind: 'evidence' | 'signature';
}

export default function Dashboard() {
  const { clients, companies, documents, audit } = useDb();
  const { user, can } = useAuth();
  const navigate = useNavigate();

  const activeClients = clients.filter((client) => client.status !== 'done' && client.status !== 'archived');
  const awaitingDocs = clients.filter((client) => client.status === 'awaiting_docs');
  const awaitingSignature = documents.filter((document) => document.status === 'awaiting_signature');
  const evidenceFollowUps = clients.flatMap((client) => {
    const current = client.workflow?.find((step) => step.status === 'pending');
    return current?.requiresEvidence && !current.evidenceIds.length ? [{ client, step: current }] : [];
  });

  const actionItems: ActionItem[] = [
    ...evidenceFollowUps.map(({ client, step }) => ({
      id: `evidence-${client.id}-${step.id}`,
      title: client.fullName,
      meta: `مدرک مرحله «${step.title}» بارگذاری نشده است`,
      to: `/clients/${client.id}`,
      kind: 'evidence' as const,
    })),
    ...awaitingSignature.map((document) => ({
      id: `signature-${document.id}`,
      title: document.title,
      meta: `${document.clientName ?? 'بدون پرونده'} • شماره ${formatCode(document.number)}`,
      to: `/documents/${document.id}`,
      kind: 'signature' as const,
    })),
  ];

  const recentClients = [...clients]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={firstName ? `سلام، ${firstName}` : 'داشبورد'}
        subtitle={`امروز ${formatDate(new Date(), 'long')} — ${displayDigits(actionItems.length)} کار در انتظار شماست`}
        actions={
          can('clients.create') ? (
            <Button variant="primary" icon="plus" onClick={() => navigate('/clients/new')}>
              پرونده جدید
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="پرونده‌های فعال"
          value={displayDigits(activeClients.length)}
          hint={`از ${displayDigits(clients.length)} پرونده`}
          icon="users"
          tone="brand"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          label="در انتظار مدارک"
          value={displayDigits(awaitingDocs.length)}
          hint="پرونده‌های ناقص"
          icon="clipboard"
          tone="warn"
          onClick={() => navigate('/clients?status=awaiting_docs')}
        />
        <StatCard
          label="در انتظار امضا"
          value={displayDigits(awaitingSignature.length)}
          hint="اسناد چاپ‌شده"
          icon="file-text"
          tone="info"
          onClick={() => navigate('/documents?status=awaiting_signature')}
        />
        <StatCard
          label="مدرک معوق"
          value={displayDigits(evidenceFollowUps.length)}
          hint="مراحل نیازمند پیگیری"
          icon="alert"
          tone="danger"
          onClick={() => navigate('/clients')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        {/* اقدام‌های باز */}
        <Card className="overflow-hidden">
          <CardHeader
            title="نیازمند اقدام"
            subtitle={actionItems.length ? 'مواردی که پرونده یا سند را متوقف کرده‌اند' : 'همه کارها به‌روز است'}
            icon="alert"
            action={
              awaitingSignature.length ? (
                <Button size="sm" variant="ghost" iconRight="arrowLeft" to="/documents?status=awaiting_signature">
                  اسناد
                </Button>
              ) : null
            }
          />
          {actionItems.length ? (
            <ul className="divide-y divide-line">
              {actionItems.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.to)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-card-2/70"
                  >
                    <span
                      className={
                        item.kind === 'evidence'
                          ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-field bg-warn-soft text-warn-fg'
                          : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-field bg-info-soft text-info-fg'
                      }
                    >
                      <Icon name={item.kind === 'evidence' ? 'alert' : 'edit'} size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{item.title}</span>
                      <span className="block truncate text-[11px] text-fg-subtle">{item.meta}</span>
                    </span>
                    <Badge tone={item.kind === 'evidence' ? 'warn' : 'info'} size="sm">
                      {item.kind === 'evidence' ? 'مدرک معوق' : 'در انتظار امضا'}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon="check" title="کار باز ندارید" description="همه مراحل پرونده‌ها و اسناد پیگیری شده‌اند." />
          )}
          {actionItems.length > 6 ? (
            <div className="border-t border-line px-4 py-2">
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="text-[11.5px] text-brand-700 hover:underline dark:text-brand-300"
              >
                و {displayDigits(actionItems.length - 6)} مورد دیگر
              </button>
            </div>
          ) : null}
        </Card>

        {/* آخرین پرونده‌ها */}
        <Card className="overflow-hidden">
          <CardHeader
            title="آخرین پرونده‌ها"
            icon="users"
            action={
              <Button size="sm" variant="ghost" iconRight="arrowLeft" to="/clients">
                همه
              </Button>
            }
          />
          {recentClients.length ? (
            <ul className="divide-y divide-line">
              {recentClients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-card-2/70"
                  >
                    <Avatar name={client.fullName} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{client.fullName}</span>
                      <span className="num block truncate text-[10.5px] text-fg-subtle">
                        {formatCode(client.code)} •{' '}
                        {CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request']} •{' '}
                        {companies.find((company) => company.id === client.companyId)?.name ?? 'بدون مجموعه'}
                      </span>
                    </span>
                    <Badge tone={CLIENT_STATUS_TONE[client.status]} size="sm">
                      {CLIENT_STATUS_LABELS[client.status]}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon="users" title="پرونده‌ای ثبت نشده است" />
          )}
        </Card>
      </div>

      {can('audit.view') ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="فعالیت اخیر"
            icon="history"
            action={
              <Button size="sm" variant="ghost" iconRight="arrowLeft" to="/audit">
                گزارش کامل
              </Button>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {audit.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-2">
                  <Avatar name={entry.userName} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-fg">
                    <span className="font-medium">{entry.userName}</span>
                    <span className="text-fg-muted"> — {entry.action}</span>
                    {entry.entityLabel ? <span className="text-fg-subtle"> ({entry.entityLabel})</span> : null}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-fg-subtle" title={formatDate(entry.at, 'datetime')}>
                    {formatRelative(entry.at)}
                  </span>
                </li>
              ))}
            </ul>
            {!audit.length ? <EmptyState compact icon="history" title="فعالیتی ثبت نشده است" /> : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
