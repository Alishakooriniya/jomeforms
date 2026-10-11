/* داشبورد — نگاه سریع به وضعیت پرونده‌ها و اسناد */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useDb } from '../store/DataProvider';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_STATUS_TONE,
  DOC_STATUS_LABELS,
} from '../data/labels';
import type { Tone } from '../data/labels';
import {
  displayDigits,
  formatCode,
  formatDate,
  formatMoneyShort,
  formatRelative,
  jalaliMonthKey,
  lastJalaliMonths,
} from '../lib/format';
import { Badge } from '../components/ui/Badge';
import { BarChart, DonutChart } from '../components/ui/Charts';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, SectionTitle, StatCard } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/Avatar';
import { Avatar } from '../components/ui/Avatar';

export default function Dashboard() {
  const { clients, documents, scans, audit } = useDb();
  const { user, can } = useAuth();
  const navigate = useNavigate();

  const months = useMemo(() => lastJalaliMonths(6), []);

  const documentsPerMonth = useMemo(
    () =>
      months.map((month) => ({
        label: month.label,
        value: documents.filter((document) => jalaliMonthKey(document.createdAt) === month.key).length,
      })),
    [months, documents],
  );

  const clientStatus = useMemo(
    () =>
      CLIENT_STATUS_OPTIONS.map((option) => ({
        label: option.label,
        value: clients.filter((client) => client.status === option.value).length,
        tone: CLIENT_STATUS_TONE[option.value] as Tone,
      })).filter((item) => item.value > 0),
    [clients],
  );

  const activeClients = clients.filter((client) => client.status !== 'done' && client.status !== 'archived');
  const awaitingSignature = documents.filter((document) => document.status === 'awaiting_signature');
  const signedDocuments = documents.filter(
    (document) => document.status === 'signed' || document.status === 'scanned',
  );
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`سلام ${user?.fullName?.split(' ')[0] ?? ''} 👋`}
        subtitle={`امروز ${formatDate(new Date(), 'long')} — خلاصه وضعیت پرونده‌ها و اسناد`}
        icon="dashboard"
        actions={
          <>
            {can('clients.create') ? (
              <Button variant="secondary" icon="plus" onClick={() => navigate('/clients?new=1')}>
                پرونده جدید
              </Button>
            ) : null}
            {can('documents.create') ? (
              <Button variant="primary" icon="file-text" onClick={() => navigate('/documents/new')}>
                سند جدید
              </Button>
            ) : null}
          </>
        }
      />

      {/* شاخص‌ها */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="پرونده‌های فعال"
          value={displayDigits(activeClients.length)}
          hint={`از مجموع ${displayDigits(clients.length)} پرونده`}
          icon="users"
          tone="brand"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          label="در انتظار امضا"
          value={displayDigits(awaitingSignature.length)}
          hint="نیازمند پیگیری"
          icon="clock"
          tone="warn"
          onClick={() => navigate('/documents?status=awaiting_signature')}
        />
        <StatCard
          label="اسناد امضاشده"
          value={displayDigits(signedDocuments.length)}
          hint={`از مجموع ${displayDigits(documents.length)} سند`}
          icon="file-text"
          tone="info"
          onClick={() => navigate('/documents?status=scanned')}
        />
        <StatCard
          label="اسکن‌های بایگانی‌شده"
          value={displayDigits(scans.length)}
          hint="نسخه امضاشده پرونده‌ها"
          icon="scan"
          tone="success"
          onClick={() => navigate('/documents')}
        />
      </div>

      {/* نمودارها */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="اسناد ثبت‌شده" subtitle="شش ماه اخیر" icon="chart" />
          <CardBody>
            {documents.length ? (
              <BarChart data={documentsPerMonth} height={170} formatValue={(value) => displayDigits(value)} />
            ) : (
              <EmptyState compact icon="chart" title="هنوز سندی ثبت نشده است" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="وضعیت پرونده‌ها" subtitle="توزیع در همه پرونده‌ها" icon="users" />
          <CardBody>
            {clientStatus.length ? (
              <DonutChart data={clientStatus} centerLabel="پرونده" />
            ) : (
              <EmptyState compact icon="users" title="پرونده‌ای ثبت نشده است" />
            )}
          </CardBody>
        </Card>
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
                      <span className="block truncate text-[12.5px] font-medium text-fg">{client.fullName}</span>
                      <span className="num block truncate text-[10.5px] text-fg-subtle">
                        {formatCode(client.code)} • {client.city} • {formatMoneyShort(client.price || client.deposit)}
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
            title="اسناد در انتظار امضا"
            icon="clock"
            action={
              <Button size="sm" variant="ghost" iconRight="arrowLeft" to="/documents?status=awaiting_signature">
                همه
              </Button>
            }
          />
          {awaitingSignature.length ? (
            <ul className="divide-y divide-line">
              {awaitingSignature.slice(0, 5).map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${document.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-card-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-warn-soft text-warn-fg">
                      <Icon name="file-text" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-fg">{document.title}</span>
                      <span className="num block truncate text-[10.5px] text-fg-subtle">
                        {formatCode(document.number)} • {document.clientName ?? 'بدون پرونده'}
                      </span>
                    </span>
                    <Icon name="chevron-left" size={15} className="text-fg-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon="check" title="همه اسناد تعیین‌تکلیف شده‌اند" description="سندی در انتظار امضا نیست." />
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
                    <span className="block truncate text-[12px] text-fg">
                      <span className="font-medium">{entry.userName}</span> — {entry.action}
                      {entry.entityLabel ? ` (${entry.entityLabel})` : ''}
                    </span>
                    {entry.detail ? (
                      <span className="block truncate text-[10.5px] text-fg-subtle">{entry.detail}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-fg-subtle">{formatRelative(entry.at)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {can('documents.view') ? (
        <div>
          <SectionTitle title="اسناد به‌تفکیک وضعیت" subtitle="برای پیگیری سریع روی هر وضعیت کلیک کنید" />
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {(Object.keys(DOC_STATUS_LABELS) as Array<keyof typeof DOC_STATUS_LABELS>).map((status) => {
              const count = documents.filter((document) => document.status === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => navigate(`/documents?status=${status}`)}
                  className="card flex items-center justify-between gap-2 p-3 text-start transition-colors hover:border-line-strong hover:bg-card-2"
                >
                  <span className="text-[12px] text-fg-muted">{DOC_STATUS_LABELS[status]}</span>
                  <span className="num text-sm font-semibold text-fg">{displayDigits(count)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
