/* پرونده: یک نمای واحد و منسجم.
   اطلاعات هویتی، مراحل رسیدگی، اسناد و تاریخچه در یک صفحه دیده می‌شوند؛
   تب‌ها حذف شده‌اند و اطلاعات کم‌کاربردتر در حاشیه یا بخش‌های تاشو قرار دارد. */

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
import { cn } from '../lib/utils';
import { displayDigits, formatCode, formatDate, formatRelative } from '../lib/format';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, InfoList, Progress } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
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
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overrideStepId, setOverrideStepId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const client = clients.find((item) => item.id === id);
  const clientDocuments = useMemo(
    () =>
      documents
        .filter((document) => document.clientId === id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [documents, id],
  );
  const clientAudit = useMemo(() => {
    const relatedIds = new Set([
      id,
      ...clientDocuments.map((document) => document.id),
      ...clientDocuments.flatMap((document) => document.scanIds),
      ...workflowEvidence.filter((item) => item.clientId === id).map((item) => item.id),
    ]);
    return audit
      .filter((entry) => entry.entityId && relatedIds.has(entry.entityId))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [audit, clientDocuments, id, workflowEvidence]);

  if (!client) {
    return (
      <div className="card">
        <EmptyState
          icon="alert"
          title="پرونده پیدا نشد"
          description="این پرونده حذف شده یا نشانی آن تغییر کرده است."
          action={
            <Button to="/clients" variant="primary" icon="users">
              بازگشت به فهرست
            </Button>
          }
        />
      </div>
    );
  }

  const workflow: ClientWorkflowStep[] =
    client.workflow ?? createClientWorkflow(client.caseType ?? 'document_request');
  const completedSteps = workflow.filter((step) => step.status === 'completed').length;
  const activeStep = workflow.find((step) => step.status !== 'completed');
  const companyName = companies.find((company) => company.id === client.companyId)?.name ?? 'بدون مجموعه';
  const creatorName = users.find((item) => item.id === client.createdBy)?.fullName ?? 'کاربر سامانه';
  const canAdvanceWorkflow = can('clients.workflow.advance');
  const canOverrideWorkflow = can('clients.workflow.override');
  const totalScans = clientDocuments.reduce((sum, document) => sum + document.scanIds.length, 0);
  const visibleAudit = showAllHistory ? clientAudit : clientAudit.slice(0, 5);

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
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-fg" title={document.title}>
            {document.title}
          </span>
          <span className="num shrink-0 text-[10.5px] text-fg-subtle">{formatCode(document.number)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      widthClassName: 'w-[110px]',
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
      widthClassName: 'w-[70px]',
      responsiveClass: 'hidden sm:table-cell',
      cell: (document) => (
        <span className="num text-[11px] text-fg-muted">
          {document.scanIds.length ? displayDigits(document.scanIds.length) : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      widthClassName: 'w-[100px]',
      cell: (document) => <span className="num text-[11px] text-fg-subtle">{formatDate(document.createdAt)}</span>,
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
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{client.fullName}</span>
            <Badge tone={CLIENT_STATUS_TONE[client.status]} dot>
              {CLIENT_STATUS_LABELS[client.status]}
            </Badge>
          </span>
        }
        subtitle={
          <span className="num flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>پرونده {formatCode(client.code)}</span>
            <span className="text-line-strong">•</span>
            <span>{CLIENT_CASE_TYPE_LABELS[client.caseType ?? 'document_request']}</span>
            <span className="text-line-strong">•</span>
            <span>{companyName}</span>
            <span className="text-line-strong">•</span>
            <span>ثبت {formatDate(client.createdAt, 'long')}</span>
          </span>
        }
        breadcrumbs={[
          { label: 'داشبورد', to: '/' },
          { label: 'پرونده‌ها', to: '/clients' },
          { label: client.fullName },
        ]}
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

      {/* نوار خلاصه — چهار عدد کلیدی در یک ردیف */}
      <div className="card grid grid-cols-2 gap-px overflow-hidden bg-line/70 sm:grid-cols-4">
        <div className="bg-card px-4 py-3">
          <p className="text-[10.5px] text-fg-subtle">پیشرفت مراحل</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="num text-[18px] font-semibold leading-6 text-fg">
              {displayDigits(completedSteps)}
              <span className="text-[12px] font-normal text-fg-subtle"> از {displayDigits(workflow.length)}</span>
            </span>
            <Progress value={completedSteps} max={workflow.length || 1} className="w-16" label="پیشرفت مراحل" />
          </div>
        </div>
        <div className="min-w-0 bg-card px-4 py-3">
          <p className="text-[10.5px] text-fg-subtle">مرحله جاری</p>
          <p className="mt-1 truncate text-[13px] font-medium text-fg" title={activeStep?.title ?? 'پرونده تکمیل شده'}>
            {activeStep?.title ?? 'پرونده تکمیل شده'}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-[10.5px] text-fg-subtle">اسناد / اسکن</p>
          <p className="num mt-1 text-[13px] font-medium text-fg">
            {displayDigits(clientDocuments.length)} / {displayDigits(totalScans)}
          </p>
        </div>
        <div className="min-w-0 bg-card px-4 py-3">
          <p className="text-[10.5px] text-fg-subtle">ثبت‌کننده</p>
          <p className="mt-1 truncate text-[13px] text-fg" title={creatorName}>
            {creatorName}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* ستون اصلی: کار جاری و اسناد */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="مراحل رسیدگی"
              subtitle={`${displayDigits(completedSteps)} از ${displayDigits(workflow.length)} مرحله تکمیل شده`}
              icon="check"
            />
            <ol className="divide-y divide-line">
              {workflow.map((step, index) => {
                const done = step.status === 'completed';
                const current = activeStep?.id === step.id;
                const stepFiles = workflowEvidence.filter(
                  (item) => item.clientId === client.id && item.stepId === step.id,
                );
                const missingEvidence = step.requiresEvidence && !stepFiles.length;
                return (
                  <li key={step.id} className={cn('px-4 py-3', current && 'bg-brand-50/40 dark:bg-brand-500/5')}>
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-medium',
                          done
                            ? 'bg-brand-600 text-white'
                            : current
                              ? 'border border-brand-500 bg-card text-brand-700 dark:text-brand-300'
                              : 'border border-line bg-card-2 text-fg-subtle',
                        )}
                      >
                        {done ? <Icon name="check" size={11} bold /> : displayDigits(index + 1)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p
                            className={cn(
                              'text-[12.5px]',
                              done || current ? 'font-medium text-fg' : 'text-fg-muted',
                            )}
                          >
                            {step.title}
                          </p>
                          {current ? (
                            <Badge tone="brand" size="sm">
                              در حال انجام
                            </Badge>
                          ) : null}
                          {step.requiresEvidence && !done ? (
                            <span className="text-[10px] text-fg-subtle">
                              {missingEvidence ? 'نیازمند مدرک' : 'مدرک بارگذاری شده'}
                            </span>
                          ) : null}
                          {done ? (
                            <span
                              className="num ms-auto text-[10px] text-fg-subtle"
                              title={step.completedBy ?? 'کاربر'}
                            >
                              {formatDate(step.completedAt, 'datetime')}
                            </span>
                          ) : null}
                        </div>

                        <p className="truncate text-[10.5px] text-fg-subtle">
                          {done
                            ? `تکمیل‌شده توسط ${step.completedBy ?? 'کاربر'}`
                            : current
                              ? step.kind === 'payment'
                                ? 'برای عبور، رسید پرداخت را بارگذاری کنید.'
                                : step.kind === 'external'
                                  ? 'برای عبور، پاسخ ارگان را بارگذاری کنید.'
                                  : step.kind === 'completion'
                                    ? 'با تکمیل این مرحله، پرونده بسته می‌شود.'
                                    : 'اطلاعات این مرحله را تکمیل کنید.'
                              : 'در انتظار رسیدن نوبت'}
                        </p>

                        {step.overrideReason ? (
                          <p className="mt-1.5 rounded-field bg-warn-soft px-2 py-1 text-[10.5px] text-warn-fg">
                            عبور مدیریتی: {step.overrideReason}
                          </p>
                        ) : null}

                        {stepFiles.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {stepFiles.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => void downloadEvidence(item)}
                                title={`${item.name} — بارگذاری ${formatDate(item.uploadedAt, 'datetime')} توسط ${item.uploadedBy}`}
                                className="inline-flex max-w-52 items-center gap-1 rounded-full border border-line bg-card px-2 py-0.5 text-[10px] text-fg-muted hover:border-line-strong hover:text-fg"
                              >
                                <Icon name="file" size={10} />
                                <span className="truncate">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {current && canAdvanceWorkflow ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {step.requiresEvidence ? (
                              <label className="btn btn-secondary btn-sm cursor-pointer">
                                <Icon name="upload" size={13} />
                                {stepFiles.length ? 'افزودن مدرک' : 'بارگذاری مدرک'}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(event) => {
                                    void uploadEvidence(step.id, event.currentTarget.files?.[0]);
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                            ) : null}
                            <Button
                              variant="primary"
                              size="sm"
                              icon="check"
                              disabled={missingEvidence}
                              onClick={() => {
                                const result = completeWorkflowStep(client.id, step.id);
                                if (result.ok) toast.success('مرحله پرونده تکمیل شد', step.title);
                                else toast.error(result.error ?? 'تکمیل مرحله انجام نشد');
                              }}
                            >
                              تکمیل مرحله
                            </Button>
                          </div>
                        ) : null}

                        {current && canOverrideWorkflow ? (
                          <details className="group mt-2">
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[10.5px] text-fg-subtle hover:text-fg">
                              <Icon name="shield" size={11} />
                              عبور مدیریتی از شرط مرحله
                              <Icon name="chevron-down" size={10} className="transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="mt-2 flex flex-wrap items-end gap-2 rounded-field border border-line bg-card p-2.5">
                              <TextInput
                                label="دلیل عبور (ثبت در گزارش فعالیت)"
                                containerClassName="min-w-48 flex-1"
                                value={overrideStepId === step.id ? overrideReason : ''}
                                onChange={(event) => {
                                  setOverrideStepId(step.id);
                                  setOverrideReason(event.target.value);
                                }}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
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
                                ثبت عبور
                              </Button>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="اسناد پرونده"
              subtitle={`${displayDigits(clientDocuments.length)} سند • ${displayDigits(totalScans)} اسکن`}
              icon="file-text"
              action={
                can('documents.create') ? (
                  <Button
                    size="sm"
                    variant="soft"
                    icon="plus"
                    onClick={() => navigate(`/documents/new?client=${client.id}`)}
                  >
                    سند
                  </Button>
                ) : null
              }
            />
            <DataTable
              rows={clientDocuments}
              columns={documentColumns}
              rowKey={(document) => document.id}
              onRowClick={(document) => navigate(`/documents/${document.id}`)}
              empty={
                <EmptyState
                  compact
                  icon="file-text"
                  title="سندی ساخته نشده است"
                  description="با انتخاب یک قالب، اطلاعات این پرونده خودکار در سند جای‌گذاری می‌شود."
                  action={
                    can('documents.create') ? (
                      <Button
                        variant="soft"
                        size="sm"
                        icon="plus"
                        onClick={() => navigate(`/documents/new?client=${client.id}`)}
                      >
                        ساخت سند
                      </Button>
                    ) : null
                  }
                />
              }
            />
          </Card>
        </div>

        {/* ستون کناری: هویت، تاریخچه */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader
              title="اطلاعات متقاضی"
              icon="user"
              action={
                can('clients.edit') ? (
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(true)}>
                    ویرایش
                  </Button>
                ) : null
              }
            />
            <div className="px-4 py-3">
              <InfoList
                columns={2}
                items={[
                  { label: 'نام و نام خانوادگی', value: client.fullName },
                  { label: 'کد ملی', value: displayDigits(client.nationalId) },
                  { label: 'موبایل', value: displayDigits(client.mobile) },
                  { label: 'شماره شناسنامه', value: client.birthCertificateNumber || '—' },
                  { label: 'نام پدر', value: client.fatherName || '—' },
                  { label: 'شهر صادره', value: client.issuePlace || '—' },
                  { label: 'تاریخ تولد', value: client.birthDate ? formatDate(client.birthDate, 'long') : '—' },
                  { label: 'آخرین به‌روزرسانی', value: formatDate(client.updatedAt, 'datetime') },
                  { label: 'نشانی محل سکونت', value: client.residenceAddress || '—' },
                ]}
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="تاریخچه فعالیت"
              subtitle={`${displayDigits(clientAudit.length)} رویداد ثبت‌شده`}
              icon="history"
              action={
                clientAudit.length > 5 ? (
                  <Button size="sm" variant="ghost" onClick={() => setShowAllHistory((prev) => !prev)}>
                    {showAllHistory ? 'کمتر' : 'همه'}
                  </Button>
                ) : null
              }
            />
            {clientAudit.length ? (
              <ul className={cn('divide-y divide-line', showAllHistory && 'max-h-80 overflow-y-auto')}>
                {visibleAudit.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 px-4 py-2">
                    <Avatar name={entry.userName} size={22} />
                    <span
                      className="min-w-0 flex-1 truncate text-[11.5px] text-fg-muted"
                      title={`${entry.action}${entry.detail ? ` — ${entry.detail}` : ''}`}
                    >
                      <span className="font-medium text-fg">{entry.userName}</span> — {entry.action}
                      {entry.entityLabel ? <span className="text-fg-subtle"> ({entry.entityLabel})</span> : null}
                    </span>
                    <span className="shrink-0 text-[10px] text-fg-subtle" title={formatDate(entry.at, 'datetime')}>
                      {formatRelative(entry.at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon="history" title="فعالیتی ثبت نشده است" />
            )}
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`ویرایش پرونده ${client.fullName}`} size="lg">
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
