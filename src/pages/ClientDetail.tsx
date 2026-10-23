/* پرونده: جزئیات، اسناد مرتبط و تاریخچه */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ClientWorkflowStep, DocRecord, WorkflowEvidence } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import type { ClientDraft } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONE,
  CLIENT_CASE_TYPE_LABELS,
  DOC_STATUS_LABELS,
  DOC_STATUS_TONE,
} from '../data/labels';
import {
  displayDigits,
  formatCode,
  formatDate,
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
import { TextInput } from '../components/ui/Field';
import { createClientWorkflow } from '../lib/caseWorkflow';
import { getBlob } from '../lib/idb';

export default function ClientDetail() {
  const { id = '' } = useParams();
  const { clients, companies, documents, audit, users, workflowEvidence } = useDb();
  const { saveClient, addWorkflowEvidence, completeWorkflowStep, overrideWorkflowStep } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('summary');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overrideStepId, setOverrideStepId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const client = clients.find((item) => item.id === id);
  const clientDocuments = useMemo(
    () => documents.filter((document) => document.clientId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [documents, id],
  );
  const clientAudit = useMemo(() => {
    const relatedIds = new Set([
      id,
      ...documents.filter((document) => document.clientId === id).map((document) => document.id),
      ...documents.filter((document) => document.clientId === id).flatMap((document) => document.scanIds),
      ...workflowEvidence.filter((item) => item.clientId === id).map((item) => item.id),
    ]);
    return audit
      .filter((entry) => entry.entityId && relatedIds.has(entry.entityId))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [audit, documents, id, workflowEvidence]);

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
  const workflow: ClientWorkflowStep[] =
    client.workflow ?? createClientWorkflow(client.caseType ?? 'document_request');
  const completedSteps = workflow.filter((step) => step.status === 'completed').length;
  const activeStep = workflow.find((step) => step.status !== 'completed');
  const companyName = companies.find((company) => company.id === client.companyId)?.name ?? 'بدون مجموعه';
  const canAdvanceWorkflow = can('clients.workflow.advance');
  const canOverrideWorkflow = can('clients.workflow.override');
  const creatorName = users.find((item) => item.id === client.createdBy)?.fullName ?? 'کاربر سامانه';

  const uploadEvidence = async (stepId: string, file?: File) => {
    if (!file) return;
    const uploaded = await addWorkflowEvidence(client.id, stepId, file);
    if (uploaded) toast.success('مدرک مرحله بارگذاری شد', uploaded.name);
    else toast.error('بارگذاری مدرک انجام نشد');
  };

  const downloadEvidence = async (item: WorkflowEvidence) => {
    const blob = await getBlob(item.blobKey);
    if (!blob) {
      toast.error('فایل مدرک در حافظه محلی پیدا نشد');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name;
    link.click();
    URL.revokeObjectURL(url);
  };

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
        subtitle={`شماره پرونده ${formatCode(client.code)} • ${CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request']} • ${companyName}`}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="پیشرفت مراحل" value={`${displayDigits(completedSteps)} از ${displayDigits(workflow.length)}`} icon="check" tone="brand" />
        <StatCard
          label="اسناد و اسکن‌های پرونده"
          value={`${displayDigits(clientDocuments.length)} / ${displayDigits(totalScans)}`}
          hint="سند / اسکن"
          icon="file-text"
          tone="success"
        />
        <StatCard
          label="مرحله جاری"
          value={activeStep?.title ?? 'پرونده تکمیل شد'}
          icon="clock"
          tone={activeStep ? 'warn' : 'success'}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'summary', label: 'خلاصه پرونده', icon: 'history', count: clientAudit.length },
          { id: 'workflow', label: 'مراحل رسیدگی', icon: 'check', count: workflow.length },
          { id: 'info', label: 'اطلاعات پرونده', icon: 'clipboard' },
          { id: 'documents', label: 'اسناد', icon: 'file-text', count: clientDocuments.length },
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
                  { label: 'شماره شناسنامه', value: client.birthCertificateNumber || '—' },
                  { label: 'نام پدر', value: client.fatherName || '—' },
                  { label: 'شهر صادره شناسنامه', value: client.issuePlace || '—' },
                  { label: 'تاریخ تولد', value: client.birthDate ? formatDate(client.birthDate, 'long') : '—', icon: 'calendar' },
                  { label: 'نشانی محل سکونت', value: client.residenceAddress || '—', icon: 'pin' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ثبت پرونده" icon="clipboard" />
            <CardBody className="flex flex-col gap-3">
              <InfoList
                items={[
                  { label: 'نوع درخواست', value: CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request'] },
                  { label: 'مجموعه', value: companyName },
                  { label: 'ثبت‌کننده', value: creatorName },
                  { label: 'تاریخ ثبت', value: formatDate(client.createdAt, 'datetime'), icon: 'calendar' },
                  { label: 'آخرین به‌روزرسانی', value: formatDate(client.updatedAt, 'datetime'), icon: 'clock' },
                ]}
                columns={2}
              />
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

      {tab === 'summary' ? (
        <Card>
          <CardHeader title="خلاصه فعالیت پرونده" subtitle="زمان ثبت، تکمیل فرم‌ها، مدارک و همه عملیات مرتبط" icon="history" />
          <CardBody className="p-0">
            {clientAudit.length ? (
              <ul className="divide-y divide-line">
                {clientAudit.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={entry.userName} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-fg">
                        <span className="font-medium">{entry.userName}</span> — {entry.action}
                        {entry.entityLabel ? ` (${entry.entityLabel})` : ''}
                      </span>
                      {entry.detail ? <span className="block text-[10.5px] text-fg-subtle">{entry.detail}</span> : null}
                    </span>
                    <span className="shrink-0 text-end text-[10.5px] text-fg-subtle">
                      <span className="block">{formatDate(entry.at, 'datetime')}</span>
                      <span className="block">{formatRelative(entry.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon="history" title="فعالیتی برای این پرونده ثبت نشده است" />
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === 'workflow' ? (
        <div className="flex flex-col gap-3">
          {workflow.map((step, index) => {
            const current = activeStep?.id === step.id;
            const stepFiles = workflowEvidence.filter((item) => item.clientId === client.id && item.stepId === step.id);
            const missingEvidence = step.requiresEvidence && !stepFiles.length;
            return (
              <Card key={step.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <span className="num text-fg-subtle">{displayDigits(index + 1)}.</span>
                      {step.title}
                    </span>
                  }
                  subtitle={
                    step.completedAt
                      ? `تکمیل‌شده توسط ${step.completedBy ?? 'کاربر'} • ${formatDate(step.completedAt, 'datetime')}`
                      : current
                        ? 'مرحله جاری پرونده'
                        : 'در انتظار رسیدن نوبت'
                  }
                  icon={step.kind === 'external' ? 'building' : 'file-text'}
                  action={
                    <Badge tone={step.status === 'completed' ? 'success' : current ? 'warn' : 'neutral'} size="sm" dot>
                      {step.status === 'completed' ? 'تکمیل‌شده' : current ? 'در حال انجام' : 'در انتظار'}
                    </Badge>
                  }
                />
                <CardBody className="flex flex-col gap-3">
                  {step.requiresEvidence ? (
                    <p className="text-[12px] leading-6 text-fg-muted">
                      برای عبور از این مرحله، {step.kind === 'payment' ? 'رسید پرداخت' : 'پاسخ ارگان'} باید اسکن و بارگذاری شود.
                    </p>
                  ) : null}
                  {step.overrideReason ? (
                    <p className="rounded-field bg-warn-soft p-2.5 text-[12px] text-warn-fg">
                      عبور مدیریتی ثبت شد. دلیل: {step.overrideReason}
                    </p>
                  ) : null}
                  {stepFiles.length ? (
                    <ul className="flex flex-col gap-1">
                      {stepFiles.map((item) => (
                        <li key={item.id}>
                          <button type="button" onClick={() => void downloadEvidence(item)} className="text-start text-[12px] text-brand-700 underline">
                            {item.name} — {formatDate(item.uploadedAt, 'datetime')}، بارگذاری توسط {item.uploadedBy}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {current && step.status === 'pending' && canAdvanceWorkflow ? (
                    <div className="flex flex-wrap items-end gap-2">
                      {step.requiresEvidence ? (
                        <label className="flex flex-col gap-1 text-[11px] text-fg-muted">
                          {step.kind === 'payment' ? 'بارگذاری اسکن رسید پرداخت' : 'بارگذاری اسکن پاسخ ارگان'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="field max-w-sm"
                            onChange={(event) => {
                              void uploadEvidence(step.id, event.currentTarget.files?.[0]);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      ) : null}
                      <Button
                        variant="primary"
                        icon="check"
                        disabled={missingEvidence}
                        onClick={() => {
                          const result = completeWorkflowStep(client.id, step.id);
                          if (result.ok) toast.success('مرحله پرونده تکمیل شد', step.title);
                          else toast.error(result.error ?? 'تکمیل مرحله انجام نشد');
                        }}
                      >
                        تکمیل مرحله و ادامه
                      </Button>
                    </div>
                  ) : null}
                  {current && canOverrideWorkflow ? (
                    <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                      <TextInput
                        label={missingEvidence ? 'دلیل عبور از شرط مدرک' : 'دلیل عبور مدیریتی از مرحله'}
                        value={overrideStepId === step.id ? overrideReason : ''}
                        onChange={(event) => {
                          setOverrideStepId(step.id);
                          setOverrideReason(event.target.value);
                        }}
                      />
                      <Button
                        variant="secondary"
                        icon="shield"
                        disabled={!overrideReason.trim() || overrideStepId !== step.id}
                        onClick={() => {
                          const result = overrideWorkflowStep(client.id, step.id, overrideReason);
                          if (result.ok) {
                            toast.success('عبور مدیریتی ثبت شد');
                            setOverrideStepId('');
                            setOverrideReason('');
                          } else toast.error(result.error ?? 'عبور مدیریتی انجام نشد');
                        }}
                      >
                        عبور مدیریتی با ثبت دلیل
                      </Button>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
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