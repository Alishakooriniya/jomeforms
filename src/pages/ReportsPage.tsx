/* گزارش‌ها — تحلیل پرونده‌ها، اسناد و عملکرد همکاران */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthProvider';
import { useDb } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import {
  CLIENT_STATUS_OPTIONS,
  CLIENT_STATUS_TONE,
  CLIENT_CASE_TYPE_LABELS,
  DOC_STATUS_LABELS,
} from '../data/labels';
import { displayDigits, jalaliMonthKey, lastJalaliMonths } from '../lib/format';
import { jalaliDateFromDate } from '../lib/jalali';
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
  const { clients, documents, templates, scans, users } = useDb();
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

  const caseTypeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    clients.forEach((client) => {
      const caseType = client.caseType ?? 'document_request';
      counts.set(caseType, (counts.get(caseType) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([caseType, count]) => ({
        label: CLIENT_CASE_TYPE_LABELS[caseType as keyof typeof CLIENT_CASE_TYPE_LABELS] ?? caseType,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [clients]);

  const agentRows = useMemo<AgentRow[]>(() => {
    const map = new Map<string, AgentRow>();
    clients.forEach((client) => {
      const name = users.find((user) => user.id === client.createdBy)?.fullName ?? 'کاربر سامانه';
      const row = map.get(name) ?? { id: name, name, clients: 0, documents: 0, scans: 0 };
      row.clients += 1;
      map.set(name, row);
    });
    documents.forEach((document) => {
      const name = document.createdByName || 'کاربر سامانه';
      const row = map.get(name) ?? { id: name, name, clients: 0, documents: 0, scans: 0 };
      row.documents += 1;
      row.scans += document.scanIds.length;
      map.set(name, row);
    });
    return Array.from(map.values()).sort((a, b) => b.documents - a.documents || b.clients - a.clients);
  }, [clients, documents, users]);

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
  const handleExport = () => {
    exportCsv(
      `report-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.csv`,
      ['بخش', 'عنوان', 'مقدار'],
      [
        ['خلاصه', 'پرونده‌ها', clients.length],
        ['خلاصه', 'اسناد', documents.length],
        ['خلاصه', 'اسکن‌ها', scans.length],
        ['خلاصه', 'نرخ امضا (٪)', signedRatio],
        ...documentsPerMonth.map((item) => ['ماهانه', item.label, item.value] as Array<string | number>),
        ...templateRows.map(
          (row) => ['قالب', row.title, `${row.documents} سند / ${row.scanned} اسکن‌شده`] as Array<string | number>,
        ),
        ...agentRows.map(
          (row) => ['ثبت‌کننده', row.name, `${row.clients} پرونده / ${row.documents} سند`] as Array<string | number>,
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
      sticky: true,
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
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="گزارش‌ها"
        subtitle="تصویر کلی از پرونده‌ها، اسناد و عملکرد همکاران"
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
          label="تعداد پرونده‌ها"
          value={displayDigits(clients.length)}
          hint="پرونده ثبت‌شده"
          icon="users"
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

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
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

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="گروه درخواست‌ها" icon="users" />
          <CardBody>
            {caseTypeDistribution.length ? (
              <BarChart data={caseTypeDistribution} height={160} tone="info" />
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

      <Card>
        <CardHeader title="وضعیت اسناد" subtitle="توزیع اسناد در مراحل چاپ، امضا و بایگانی" icon="clipboard" />
        <div className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(DOC_STATUS_LABELS) as Array<keyof typeof DOC_STATUS_LABELS>).map((status) => (
            <div key={status} className="bg-card px-3 py-2.5">
              <p className="text-[10.5px] text-fg-subtle">{DOC_STATUS_LABELS[status]}</p>
              <p className="num mt-0.5 text-[16px] font-semibold text-fg">
                {displayDigits(documents.filter((document) => document.status === status).length)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="card overflow-hidden">
        <CardHeader title="ثبت‌کنندگان پرونده و سند" subtitle="بر پایه پرونده‌ها و اسناد ثبت‌شده" icon="user-cog" />
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

    </div>
  );
}
