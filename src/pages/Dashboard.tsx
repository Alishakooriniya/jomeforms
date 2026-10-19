/* داشبورد — نگاه سریع به وضعیت پرونده‌ها و اسناد */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useDb } from '../store/DataProvider';
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, CLIENT_CASE_TYPE_LABELS } from '../data/labels';
import {
  displayDigits,
  formatCode,
  formatDate,
  formatRelative,
} from '../lib/format';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/Avatar';
import { Avatar } from '../components/ui/Avatar';

export default function Dashboard() {
  const { clients, companies, documents, scans, audit } = useDb();
  const { user, can } = useAuth();
  const navigate = useNavigate();

  const activeClients = clients.filter((client) => client.status !== 'done' && client.status !== 'archived');
  const awaitingSignature = documents.filter((document) => document.status === 'awaiting_signature');
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const documentRequests = clients.filter((client) => (client.caseType ?? 'document_request') === 'document_request');
  const rentRenewals = clients.filter((client) => client.caseType === 'rent_renewal');
  const evidenceFollowUps = clients.flatMap((client) => {
    const current = client.workflow?.find((step) => step.status === 'pending');
    return current?.requiresEvidence && !current.evidenceIds.length ? [{ client, step: current }] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={` ${user?.fullName?.split(' ')[0] ?? ''} خوش آمدید`}
        subtitle={`امروز ${formatDate(new Date(), 'long')}`}
        icon="dashboard"
        actions={
          <>
            {can('clients.create') ? (
              <Button size="lg" variant="primary" icon="plus" onClick={() => navigate('/clients/new')}>
                ثبت پرونده جدید
              </Button>
            ) : null}
          </>
        }
      />

      {/* شاخص‌ها */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="پرونده‌های فعال"
          value={displayDigits(activeClients.length)}
          hint={`از مجموع ${displayDigits(clients.length)} پرونده`}
          icon="users"
          tone="brand"
          onClick={() => navigate('/clients?caseType=document_request')}
        />
        <StatCard
          label="درخواست سند"
          value={displayDigits(documentRequests.length)}
          hint="پرونده‌های این گروه"
          icon="file-text"
          tone="info"
          onClick={() => navigate('/clients?caseType=rent_renewal')}
        />
        <StatCard
          label="تجدید اجاره"
          value={displayDigits(rentRenewals.length)}
          hint="پرونده‌های این گروه"
          icon="refresh"
          tone="warn"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          label="اسناد و فرم‌های ثبت‌شده"
          value={displayDigits(documents.length)}
          hint={`در انتظار امضا: ${displayDigits(awaitingSignature.length)} • اسکن: ${displayDigits(scans.length)}`}
          icon="file-text"
          tone="success"
          onClick={() => navigate('/documents')}
        />
      </div>

      {/* فهرست‌ها */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
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
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-card-2"
                  >
                    <Avatar name={client.fullName} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-fg">{client.fullName}</span>
                      <span className="num block truncate text-[12px] text-fg-muted">
                        {formatCode(client.code)} • {CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request']} • {companies.find((company) => company.id === client.companyId)?.name ?? 'بدون مجموعه'}
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

        <Card>
          <CardHeader
            title="مراحل نیازمند پیگیری"
            icon="clock"
            action={
              <Button size="sm" variant="ghost" iconRight="arrowLeft" to="/clients">
                همه
              </Button>
            }
          />
          {evidenceFollowUps.length ? (
            <ul className="divide-y divide-line">
              {evidenceFollowUps.slice(0, 5).map(({ client, step }) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-card-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-warn-soft text-warn-fg">
                      <Icon name="clock" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-fg">{client.fullName}</span>
                      <span className="num block truncate text-[12px] text-fg-muted">
                        {formatCode(client.code)} • {step.title}
                      </span>
                    </span>
                    <Icon name="chevron-left" size={15} className="text-fg-subtle" />
                  </button>
                </li>
                ))}
            </ul>
          ) : (
            <EmptyState compact icon="check" title="مدرک معوقی ثبت نشده است" description="همه مراحل دارای شرط مدرک، مدرک خود را دارند." />
          )}
        </Card>
      </div>

      {can('audit.view') ? (
        <Card>
          <CardHeader
            title="فعالیت‌های اخیر"
            subtitle="آخرین تغییرات ثبت‌شده در سامانه"
            icon="history"
            action={
              <Button size="sm" variant="ghost" iconRight="arrowLeft" to="/audit">
                گزارش کامل
              </Button>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {audit.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={entry.userName} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">
                      <span className="font-medium">{entry.userName}</span> — {entry.action}
                      {entry.entityLabel ? ` (${entry.entityLabel})` : ''}
                    </span>
                    {entry.detail ? (
                      <span className="block truncate text-[12px] text-fg-muted">{entry.detail}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[12px] text-fg-muted">{formatRelative(entry.at)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

    </div>
  );
}
