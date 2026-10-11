/* گزارش‌ها — تحلیل پرونده‌ها، اسناد و عملکرد همکاران */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useDb } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_STATUS_TONE,
  DEAL_KIND_LABELS,
  DOC_STATUS_LABELS,
  PROPERTY_KIND_LABELS,
} from '../data/labels';
import { displayDigits, formatMoneyShort, jalaliMonthKey, lastJalaliMonths } from '../lib/format';
import { exportCsv } from '../lib/print';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '../components/ui/Card';
import { BarChart, DonutChart } from '../components/ui/Charts';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/Avatar';
import { Pagination } from '../components/ui/Pagination';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { useListQuery } from '../lib/hooks';
import { compareText } from '../lib/utils';

interface AgentRow {
  id: string;
  name: string;
  clients: number;
  documents: number;
  scans: number;
  value: number;
}

interface TemplateRow {
  id: string;
  title: string;
  documents: number;
  signed: number;
  scanned: number;
  draft: number;
}

export default function ReportsPage() {
  const { clients, documents, templates, scans } = useDb();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const months = useMemo(() => lastJalaliMonths(6), []);

  const documentsPerMonth = months.map((month) => ({
    label: month.label,
    value: documents.filter((document) => jalaliMonthKey(document.createdAt) === month.key).length,
    secondary: clients.filter((client) => jalaliMonthKey(client.createdAt) === month.key).length,
  }));

  const clientStatus = CLIENT_STATUS_OPTIONS.map((option) => ({
    label: option.label,
    value: clients.filter((client) => client.status === option.value).length,
    tone: CLIENT_STATUS_TONE[option.value],
  })).filter((item) => item.value > 0);

  const propertyDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    clients.forEach((client) => counts.set(client.propertyKind, (counts.get(client.propertyKind) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([kind, count]) => ({
        label: PROPERTY_KIND_LABELS[kind as keyof typeof PROPERTY_KIND_LABELS] ?? kind,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [clients]);

  const agentRows = useMemo<AgentRow[]>(() => {
    const map = new Map<string, AgentRow>();
    clients.forEach((client) => {
      const name = client.agentName?.trim() || 'بدون کارشناس';
      const row = map.get(name) ?? { id: name, name, clients: 0, documents: 0, scans: 0, value: 0 };
      row.clients += 1;
      row.value += client.price || client.deposit || 0;
      map.set(name, row);
    });
    documents.forEach((document) => {
      const client = clients.find((item) => item.id === document.clientId);
      const name = client?.agentName?.trim() || document.createdByName || 'بدون کارشناس';
      const row = map.get(name) ?? { id: name, name, clients: 0, documents: 0, scans: 0, value: 0 };
      row.documents += 1;
      row.scans += document.scanIds.length;
      map.set(name, row);
    });
    return Array.from(map.values()).sort((a, b) => b.documents - a.documents || b.clients - a.clients);
  }, [clients, documents]);

  const templateRows = useMemo<TemplateRow[]>(
    () =>
      templates
        .map((template) => {
          const docs = documents.filter((document) => document.templateId === template.id);
          return {
            id: template.id,
            title: template.title,
            documents: docs.length,
            signed: docs.filter((document) => document.status === 'signed' || document.status === 'scanned').length,
            scanned: docs.filter((document) => document.scanIds.length > 0).length,
            draft: docs.filter((document) => document.status === 'draft').length,
          };
        })
        .sort((a, b) => b.documents - a.documents),
    [templates, documents],
  );

  const query = useListQuery<AgentRow>(agentRows, {
    pageSize: 8,
    search: (row) => row.name,
    sorters: {
      name: (a, b) => compareText(a.name, b.name),
      clients: (a, b) => a.clients - b.clients,
      documents: (a, b) => a.documents - b.documents,
      scans: (a, b) => a.scans - b.scans,
      value: (a, b) => a.value - b.value,
    },
  });

  const signedRatio = documents.length
    ? Math.round(
        (documents.filter((document) => document.status === 'signed' || document.status === 'scanned').length /
          documents.length) *
          100,
      )
    : 0;
  const scannedRatio = documents.length
    ? Math.round((documents.filter((document) => document.scanIds.length > 0).length / documents.length) * 100)
    : 0;
  const totalValue = clients.reduce((sum, client) => sum + (client.price || client.deposit || 0), 0);

  const handleExport = () => {
    exportCsv(
      `report-${new Date().toISOString().slice(0, 10)}.csv`,
      ['بخش', 'عنوان', 'مقدار'],
      [
        ['خلاصه', 'پرونده‌ها', clients.length],
        ['خلاصه', 'اسناد', documents.length],
        ['خلاصه', 'اسکن‌ها', scans.length],
        ['خلاصه', 'نرخ امضا (٪)', signedRatio],
        ['خلاصه', 'ارزش پرونده‌ها (تومان)', totalValue],
        ...documentsPerMonth.map((item) => ['ماهانه', item.label, item.value] as Array<string | number>),
        ...templateRows.map(
          (row) => ['قالب', row.title, `${row.documents} سند / ${row.scanned} اسکن‌شده`] as Array<string | number>,
        ),
        ...agentRows.map(
          (row) => ['کارشناس', row.name, `${row.clients} پرونده / ${row.documents} سند`] as Array<string | number>,
        ),
      ],
    );
    toast.success('خروجی گزارش آماده شد');
  };

  const agentColumns: Array<Column<AgentRow>> = [
    {
      key: 'name',
      header: 'کارشناس',
      sortable: true,
      cell: (row) => (
        <button type="button" className="text-[12.5px] text-fg hover:text-brand-700" onClick={() => query.setQ(row.name)}>
          {row.name}
        </button>
      ),
    },
    {
      key: 'clients',
      header: 'پرونده',
      sortable: true,
      align: 'center',
      cell: (row) => <span className="num text-[12px] text-fg-muted">{displayDigits(row.clients)}</span>,
    },
    {
      key: 'documents',
      header: 'سند',
      sortable: true,
      align: 'center',
      cell: (row) => <span className="num text-[12px] text-fg-muted">{displayDigits(row.documents)}</span>,
    },
    {
      key: 'scans',
      header: 'اسکن',
      sortable: true,
      align: 'center',
      cell: (row) => <span className="num text-[12px] text-fg-muted">{displayDigits(row.scans)}</span>,
    },
    {
      key: 'value',
      header: 'ارزش پرونده‌ها',
      sortable: true,
      cell: (row) => <span className="num text-[12px] text-fg">{formatMoneyShort(row.value)}</span>,
      responsiveClass: 'hidden sm:table-cell',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="گزارش‌ها"
        subtitle="تصویر کلی از پرونده‌ها، اسناد و عملکرد همکاران"
        icon="chart"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'گزارش‌ها' }]}
        actions={
          can('reports.export') ? (
            <Button variant="secondary" icon="download" onClick={handleExport}>
              خروجی CSV
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ارزش کل پرونده‌ها"
          value={formatMoneyShort(totalValue)}
          hint={`${displayDigits(clients.length)} پرونده`}
          icon="percentCircle"
          tone="brand"
        />
        <StatCard
          label="نرخ امضای اسناد"
          value={displayDigits(`${signedRatio}٪`)}
          hint={`${displayDigits(documents.length)} سند ثبت‌شده`}
          icon="edit"
          tone="info"
        />
        <StatCard
          label="نرخ بایگانی اسکن"
          value={displayDigits(`${scannedRatio}٪`)}
          hint={`${displayDigits(scans.length)} فایل اسکن`}
          icon="scan"
          tone="success"
        />
        <StatCard
          label="در انتظار امضا"
          value={displayDigits(documents.filter((document) => document.status === 'awaiting_signature').length)}
          hint="نیازمند پیگیری"
          icon="clock"
          tone="warn"
          onClick={() => navigate('/documents?status=awaiting_signature')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="روند شش‌ماهه"
            subtitle="ستون پررنگ: اسناد ساخته‌شده — ستون کم‌رنگ: پرونده‌های جدید"
            icon="chart"
          />
          <CardBody>
            <BarChart data={documentsPerMonth} height={180} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="توزیع وضعیت پرونده‌ها" icon="users" />
          <CardBody>
            {clientStatus.length ? (
              <DonutChart data={clientStatus} centerLabel="پرونده" />
            ) : (
              <EmptyState compact icon="users" title="داده‌ای برای نمایش نیست" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="نوع ملک در پرونده‌ها" icon="building" />
          <CardBody>
            {propertyDistribution.length ? (
              <BarChart data={propertyDistribution} height={160} tone="info" />
            ) : (
              <EmptyState compact icon="building" title="داده‌ای برای نمایش نیست" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="استفاده از قالب‌ها" subtitle="میزان تولید سند با هر قالب" icon="template" />
          <CardBody className="p-0">
            {templateRows.length ? (
              <ul className="divide-y divide-line">
                {templateRows.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[12px] text-fg">{row.title}</span>
                    <Badge tone="neutral" size="sm">
                      <span className="num">{displayDigits(row.documents)}</span> سند
                    </Badge>
                    <Badge tone={row.scanned ? 'success' : 'neutral'} size="sm">
                      <span className="num">{displayDigits(row.scanned)}</span> اسکن
                    </Badge>
                    {row.draft ? (
                      <Badge tone="warn" size="sm">
                        <span className="num">{displayDigits(row.draft)}</span> پیش‌نویس
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon="template" title="قالبی وجود ندارد" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="card overflow-hidden">
        <CardHeader title="عملکرد کارشناسان" subtitle="بر پایه پرونده‌ها و اسناد ثبت‌شده" icon="user-cog" />
        <DataTable
          rows={query.pageRows}
          columns={agentColumns}
          rowKey={(row) => row.id}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          onSort={query.toggleSort}
          empty={<EmptyState compact icon="user-cog" title="داده‌ای برای نمایش نیست" />}
        />
        {query.total > query.pageSize ? (
          <div className="border-t border-line">
            <Pagination
              page={query.page}
              pageCount={query.pageCount}
              total={query.total}
              pageSize={query.pageSize}
              onPageChange={query.setPage}
              onPageSizeChange={query.setPageSize}
            />
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader title="خلاصه وضعیت اسناد" icon="clipboard" />
        <CardBody className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(DOC_STATUS_LABELS) as Array<keyof typeof DOC_STATUS_LABELS>).map((status) => (
            <div key={status} className="rounded-field border border-line bg-card-2/50 p-3">
              <p className="text-[11.5px] text-fg-muted">{DOC_STATUS_LABELS[status]}</p>
              <p className="num mt-1 text-lg font-semibold text-fg">
                {displayDigits(documents.filter((document) => document.status === status).length)}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="خلاصه نوع معامله" icon="percent" />
        <CardBody className="flex flex-wrap gap-2">
          {Object.entries(DEAL_KIND_LABELS).map(([kind, label]) => {
            const count = clients.filter((client) => client.dealKind === kind).length;
            return (
              <span key={kind} className="chip">
                {label}
                <span className="num text-fg">{displayDigits(count)}</span>
              </span>
            );
          })}
          {Object.entries(CLIENT_STATUS_LABELS).map(([status, label]) => (
            <span key={status} className="chip">
              {label}
              <span className="num text-fg">
                {displayDigits(clients.filter((client) => client.status === status).length)}
              </span>
            </span>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
