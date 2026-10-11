/* پرونده: جزئیات، اسناد مرتبط و تاریخچه */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DocRecord } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { ClientDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONE,
  DEAL_KIND_LABELS,
  DOC_STATUS_LABELS,
  DOC_STATUS_TONE,
  PARTY_ROLE_LABELS,
  PROPERTY_KIND_LABELS,
} from '../data/labels';
import {
  displayDigits,
  formatArea,
  formatCode,
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatRelative,
} from '../lib/format';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList, StatCard } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { DataTable } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { ClientForm, clientToDraft } from '../components/clients/ClientForm';
import { Icon } from '../components/ui/Icon';

export default function ClientDetail() {
  const { id = '' } = useParams();
  const { clients, documents, audit } = useDb();
  const { saveClient } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const client = clients.find((item) => item.id === id);
  const clientDocuments = useMemo(
    () => documents.filter((document) => document.clientId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [documents, id],
  );
  const clientAudit = useMemo(() => audit.filter((entry) => entry.entityId === id).slice(0, 20), [audit, id]);

  if (!client) {
    return (
      <div className="card">
        <EmptyState
          icon="alert"
          title="پرونده پیدا نشد"
          description="این پرونده حذف شده یا نشانی آن تغییر کرده است."
          action={<Button to="/clients" variant="primary" icon="users">بازگشت به فهرست</Button>}
        />
      </div>
    );
  }

  const totalScans = clientDocuments.reduce((sum, document) => sum + document.scanIds.length, 0);

  const documentColumns: Array<Column<DocRecord>> = [
    {
      key: 'title',
      header: 'سند',
      cell: (document) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-fg">{document.title}</p>
          <p className="num text-[10.5px] text-fg-subtle">{formatCode(document.number)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      cell: (document) => (
        <Badge tone={DOC_STATUS_TONE[document.status]} size="sm" dot>
          {DOC_STATUS_LABELS[document.status]}
        </Badge>
      ),
    },
    {
      key: 'scans',
      header: 'اسکن',
      align: 'center',
      cell: (document) => (
        <span className="num text-[12px] text-fg-muted">{displayDigits(document.scanIds.length)}</span>
      ),
      responsiveClass: 'hidden sm:table-cell',
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      cell: (document) => <span className="text-[11.5px] text-fg-muted">{formatDate(document.createdAt)}</span>,
    },
  ];

  const submit = (draft: ClientDraft) => {
    setSubmitting(true);
    saveClient(draft, client.id);
    setSubmitting(false);
    setEditing(false);
    toast.success('پرونده به‌روزرسانی شد');
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {client.fullName}
            <Badge tone={CLIENT_STATUS_TONE[client.status]} dot>
              {CLIENT_STATUS_LABELS[client.status]}
            </Badge>
          </span>
        }
        subtitle={`شماره پرونده ${formatCode(client.code)} • ${DEAL_KIND_LABELS[client.dealKind]} • ${client.city}`}
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'پرونده‌ها', to: '/clients' }, { label: client.fullName }]}
        actions={
          <>
            {can('clients.edit') ? (
              <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>
                ویرایش
              </Button>
            ) : null}
            {can('documents.create') ? (
              <Button variant="primary" icon="file-text" onClick={() => navigate(`/documents/new?client=${client.id}`)}>
                سند جدید
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="قیمت کل" value={formatMoneyShort(client.price)} icon="building" tone="brand" />
        <StatCard
          label="ودیعه / علی‌الحساب"
          value={formatMoneyShort(client.deposit)}
          icon="percentCircle"
          tone="info"
        />
        <StatCard label="اجاره ماهانه" value={formatMoneyShort(client.rent)} icon="chart" tone="warn" />
        <StatCard
          label="اسناد و اسکن‌ها"
          value={`${displayDigits(clientDocuments.length)} / ${displayDigits(totalScans)}`}
          hint="سند / اسکن"
          icon="file-text"
          tone="success"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'info', label: 'اطلاعات پرونده', icon: 'clipboard' },
          { id: 'documents', label: 'اسناد', icon: 'file-text', count: clientDocuments.length },
          { id: 'activity', label: 'تاریخچه', icon: 'history', count: clientAudit.length },
        ]}
      />

      {tab === 'info' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="اطلاعات هویتی" icon="user" />
            <CardBody>
              <InfoList
                items={[
                  { label: 'نام و نام خانوادگی', value: client.fullName, icon: 'user' },
                  { label: 'کد ملی', value: displayDigits(client.nationalId), icon: 'clipboard' },
                  { label: 'موبایل', value: displayDigits(client.mobile), icon: 'phone' },
                  { label: 'تلفن ثابت', value: client.phone ? displayDigits(client.phone) : '—', icon: 'phone' },
                  { label: 'نام پدر', value: client.fatherName ?? '—' },
                  { label: 'تاریخ تولد', value: client.birthDate ? formatDate(client.birthDate, 'long') : '—', icon: 'calendar' },
                  { label: 'نقش در معامله', value: PARTY_ROLE_LABELS[client.partyRole] },
                  { label: 'ایمیل', value: client.email ?? '—' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="طرف دوم معامله" icon="users" />
            <CardBody>
              <InfoList
                items={[
                  { label: 'نام', value: client.party2Name ?? '—', icon: 'user' },
                  { label: 'نقش', value: client.party2Role ? PARTY_ROLE_LABELS[client.party2Role] : '—' },
                  { label: 'کد ملی', value: client.party2NationalId ? displayDigits(client.party2NationalId) : '—' },
                  { label: 'موبایل', value: client.party2Mobile ? displayDigits(client.party2Mobile) : '—', icon: 'phone' },
                  { label: 'کارشناس / مشاور', value: client.agentName ?? '—', icon: 'user-cog' },
                  { label: 'منبع آشنایی', value: client.source ?? '—' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="مشخصات ملک" icon="building" />
            <CardBody>
              <InfoList
                items={[
                  { label: 'نوع ملک', value: PROPERTY_KIND_LABELS[client.propertyKind], icon: 'building' },
                  { label: 'متراژ', value: formatArea(client.area) },
                  { label: 'استان / شهر', value: `${client.province} / ${client.city}`, icon: 'pin' },
                  { label: 'محله / منطقه', value: client.region ?? '—' },
                  { label: 'پلاک ثبتی', value: client.plate ? displayDigits(client.plate) : '—' },
                  { label: 'واحد / طبقه', value: `${client.unit || '—'} / ${client.floor || '—'}` },
                  { label: 'سال ساخت', value: client.buildYear ? displayDigits(client.buildYear) : '—' },
                  { label: 'نشانی', value: client.address, icon: 'pin' },
                ]}
                columns={1}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="مالی و توضیحات" icon="percentCircle" />
            <CardBody className="flex flex-col gap-3">
              <InfoList
                items={[
                  { label: 'قیمت کل', value: formatMoney(client.price) },
                  { label: 'ودیعه', value: formatMoney(client.deposit) },
                  { label: 'اجاره ماهانه', value: formatMoney(client.rent) },
                  { label: 'درصد کمیسیون', value: displayDigits(`${client.commissionPercent}٪`) },
                  { label: 'ثبت‌کننده', value: client.createdBy === 'u-super' ? 'سارا رضایی' : 'کاربر سامانه' },
                  { label: 'تاریخ ثبت', value: formatDate(client.createdAt, 'long'), icon: 'calendar' },
                ]}
                columns={2}
              />
              {client.tags.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Icon name="tag" size={14} className="text-fg-subtle" />
                  {client.tags.map((tag) => (
                    <Badge key={tag} tone="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {client.notes ? (
                <p className="rounded-field bg-card-2 p-3 text-[12px] leading-6 text-fg-muted">{client.notes}</p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'documents' ? (
        <div className="card overflow-hidden">
          <DataTable
            rows={clientDocuments}
            columns={documentColumns}
            rowKey={(document) => document.id}
            onRowClick={(document) => navigate(`/documents/${document.id}`)}
            empty={
              <EmptyState
                icon="file-text"
                title="برای این پرونده سندی ساخته نشده است"
                description="با انتخاب یک قالب، اطلاعات این پرونده به‌صورت خودکار در سند جای‌گذاری می‌شود."
                action={
                  can('documents.create') ? (
                    <Button variant="primary" icon="plus" onClick={() => navigate(`/documents/new?client=${client.id}`)}>
                      ساخت سند
                    </Button>
                  ) : null
                }
              />
            }
          />
        </div>
      ) : null}

      {tab === 'activity' ? (
        <Card>
          <CardHeader title="تاریخچه پرونده" subtitle="بر پایه گزارش فعالیت سامانه" icon="history" />
          <CardBody className="p-0">
            {clientAudit.length ? (
              <ul className="divide-y divide-line">
                {clientAudit.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={entry.userName} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-fg">
                        <span className="font-medium">{entry.userName}</span> — {entry.action}
                      </span>
                      {entry.detail ? <span className="block truncate text-[10.5px] text-fg-subtle">{entry.detail}</span> : null}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-fg-subtle">{formatRelative(entry.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon="history" title="فعالیتی برای این پرونده ثبت نشده است" />
            )}
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={`ویرایش پرونده ${client.fullName}`}
        icon="edit"
        size="xl"
      >
        <ClientForm
          initial={clientToDraft(client)}
          submitting={submitting}
          submitLabel="ذخیره تغییرات"
          onCancel={() => setEditing(false)}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}