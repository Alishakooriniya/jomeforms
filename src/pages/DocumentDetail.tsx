/* جزئیات سند: پیش‌نمایش، گردش کار، بارگذاری اسکن و عملیات چاپ/خروجی */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DocStatus } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { DOC_STATUS_LABELS, DOC_STATUS_TONE, TEMPLATE_CATEGORY_LABELS } from '../data/labels';
import { displayDigits, formatCode, formatDate, formatRelative, nowISO } from '../lib/format';
import {
  copyDocumentText,
  downloadDocumentAsHtml,
  downloadDocumentAsText,
  printDocument,
} from '../lib/documentActions';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList } from '../components/ui/Card';
import { Dropdown } from '../components/ui/Dropdown';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { Textarea } from '../components/ui/Field';
import { DynamicFields, formatValuePreview } from '../components/form/DynamicFields';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { ScanGallery } from '../components/documents/ScanGallery';

export default function DocumentDetail() {
  const { id = '' } = useParams();
  const { documents, templates, settings, scans } = useDb();
  const { updateDocument, setDocumentStatus, deleteDocument } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('preview');
  const [editing, setEditing] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const document = documents.find((item) => item.id === id);
  const template = templates.find((item) => item.id === document?.templateId);
  const documentScans = scans.filter((scan) => scan.documentId === id);

  if (!document) {
    return (
      <div className="card">
        <EmptyState
          icon="alert"
          title="سند پیدا نشد"
          description="این سند حذف شده یا نشانی آن تغییر کرده است."
          action={
            <Button to="/documents" variant="primary" icon="file-text">
              بازگشت به فهرست اسناد
            </Button>
          }
        />
      </div>
    );
  }

  const handlePrint = () => {
    if (!template) {
      toast.error('قالب این سند در دسترس نیست');
      return;
    }
    const opened = printDocument(document, template, settings);
    if (!opened) {
      toast.warn('پنجره چاپ باز نشد', 'اجازه بازشدن پنجره جدید را در مرورگر فعال کنید.');
      return;
    }
    updateDocument(
      document.id,
      {
        printedAt: nowISO(),
        status: document.status === 'draft' ? 'awaiting_signature' : document.status,
      },
      'چاپ سند',
    );
  };

  const workflow = [
    {
      id: 'created',
      title: 'سند ساخته شد',
      at: document.createdAt,
      by: document.createdByName,
      icon: 'plus' as const,
      done: true,
    },
    {
      id: 'printed',
      title: 'چاپ / خروجی گرفته شد',
      at: document.printedAt,
      by: document.createdByName,
      icon: 'print' as const,
      done: Boolean(document.printedAt),
    },
    {
      id: 'signed',
      title: 'به امضای طرفین رسید',
      at: document.signedAt,
      by: '—',
      icon: 'edit' as const,
      done: Boolean(document.signedAt),
    },
    {
      id: 'scanned',
      title: 'اسکن امضاشده بایگانی شد',
      at: documentScans[0]?.uploadedAt,
      by: documentScans[0]?.uploadedBy ?? '—',
      icon: 'scan' as const,
      done: documentScans.length > 0,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {document.title}
            <Badge tone={DOC_STATUS_TONE[document.status]} dot>
              {DOC_STATUS_LABELS[document.status]}
            </Badge>
          </span>
        }
        subtitle={
          <span className="num">
            شماره سند {formatCode(document.number)}
            {document.clientName ? ` • پرونده ${document.clientName}` : ' • بدون پرونده'}
            {` • ثبت ${formatDate(document.createdAt, 'long')}`}
          </span>
        }
        breadcrumbs={[
          { label: 'داشبورد', to: '/' },
          { label: 'اسناد', to: '/documents' },
          { label: formatCode(document.number) },
        ]}
        actions={
          <>
            {can('documents.edit') ? (
              <Button
                variant="secondary"
                icon="edit"
                onClick={() => {
                  setDraftValues({ ...document.values });
                  setEditing(true);
                }}
              >
                ویرایش مقادیر
              </Button>
            ) : null}
            {can('documents.print') ? (
              <Button variant="primary" icon="print" onClick={handlePrint}>
                چاپ / PDF
              </Button>
            ) : null}
            <Dropdown
              label="عملیات بیشتر"
              items={[
                ...(can('documents.print')
                  ? [
                      {
                        id: 'html',
                        label: 'دانلود نسخه HTML',
                        icon: 'download' as const,
                        onSelect: () => {
                          if (!template) return;
                          downloadDocumentAsHtml(document, template, settings);
                          toast.success('فایل HTML دانلود شد');
                        },
                      },
                      {
                        id: 'txt',
                        label: 'دانلود متن ساده',
                        icon: 'file' as const,
                        onSelect: () => {
                          if (!template) return;
                          downloadDocumentAsText(document, template, settings);
                          toast.success('فایل متنی دانلود شد');
                        },
                      },
                      {
                        id: 'copy',
                        label: 'کپی متن سند',
                        icon: 'copy' as const,
                        onSelect: () => {
                          if (!template) return;
                          void copyDocumentText(document, template, settings).then((ok) =>
                            ok ? toast.success('متن سند کپی شد') : toast.error('کپی متن ممکن نشد'),
                          );
                        },
                      },
                    ]
                  : []),
                ...(document.clientId
                  ? [
                      {
                        id: 'client',
                        label: 'مشاهده پرونده',
                        icon: 'users' as const,
                        onSelect: () => navigate(`/clients/${document.clientId}`),
                      },
                    ]
                  : []),
                ...(can('documents.status') ? [{ id: 'sep', label: '', separator: true, onSelect: () => {} }] : []),
                ...(can('documents.status')
                  ? (Object.keys(DOC_STATUS_LABELS) as DocStatus[])
                      .filter((status) => status !== document.status)
                      .map((status) => ({
                        id: status,
                        label: `تغییر وضعیت به ${DOC_STATUS_LABELS[status]}`,
                        icon: 'refresh' as const,
                        onSelect: () => {
                          setDocumentStatus(document.id, status);
                          toast.success('وضعیت سند تغییر کرد', DOC_STATUS_LABELS[status]);
                        },
                      }))
                  : []),
                ...(can('documents.delete') ? [{ id: 'sep2', label: '', separator: true, onSelect: () => {} }] : []),
                ...(can('documents.delete')
                  ? [
                      {
                        id: 'delete',
                        label: 'حذف سند',
                        icon: 'trash' as const,
                        danger: true,
                        onSelect: () => setPendingDelete(true),
                      },
                    ]
                  : []),
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        {/* ستون سند */}
        <div className="flex min-w-0 flex-col gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'preview', label: 'پیش‌نمایش سند', icon: 'eye' },
              { id: 'values', label: 'مقادیر ثبت‌شده', icon: 'list' },
            ]}
          />

          {tab === 'preview' ? (
            <DocumentPreview template={template} values={document.values} document={document} settings={settings} />
          ) : null}

          {tab === 'values' ? (
            <Card>
              <CardHeader
                title="مقادیر سند"
                subtitle={template ? `بر پایه قالب «${template.title}» نسخه ${displayDigits(template.version)}` : undefined}
                icon="clipboard"
              />
              <CardBody>
                {template ? (
                  <InfoList
                    items={template.fields.map((field) => ({
                      label: field.label,
                      value: formatValuePreview(field, document.values[field.key] ?? ''),
                    }))}
                    columns={2}
                  />
                ) : (
                  <EmptyState compact icon="alert" title="قالب این سند در دسترس نیست" />
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        {/* ستون کنار */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="گردش کار سند" subtitle="مسیر سند تا بایگانی نهایی" icon="history" />
            <CardBody className="p-0">
              <ol className="flex flex-col">
                {workflow.map((item, index) => (
                  <li key={item.id} className="flex gap-3 px-4 py-2.5">
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          item.done
                            ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white'
                            : 'flex h-7 w-7 items-center justify-center rounded-full bg-card-2 text-fg-subtle'
                        }
                      >
                        <Icon name={item.icon} size={13} bold={item.done} />
                      </span>
                      {index < workflow.length - 1 ? (
                        <span className={item.done ? 'h-8 w-px bg-brand-300' : 'h-8 w-px bg-line'} />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-[12.5px] text-fg">{item.title}</p>
                      <p className="num text-[10.5px] text-fg-subtle">
                        {item.at ? `${formatDate(item.at, 'datetime')} • ${formatRelative(item.at)}` : 'انجام نشده'}
                        {item.done && item.by !== '—' ? ` • ${item.by}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="اسکن نسخه امضاشده"
              subtitle={documentScans.length ? `${displayDigits(documentScans.length)} فایل بایگانی‌شده` : 'هنوز بارگذاری نشده'}
              icon="scan"
            />
            <CardBody>
              <ScanGallery
                document={document}
                canUpload={can('documents.upload')}
                canDelete={can('documents.upload')}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="یادداشت سند"
              icon="edit"
              action={
                can('documents.edit') ? (
                  <Button
                    size="sm"
                    variant="soft"
                    icon="save"
                    disabled={!noteDraft.trim()}
                    onClick={() => {
                      const suffix = [document.notes, noteDraft.trim()].filter(Boolean).join('\n');
                      updateDocument(document.id, { notes: suffix }, 'افزودن یادداشت');
                      setNoteDraft('');
                      toast.success('یادداشت ثبت شد');
                    }}
                  >
                    افزودن
                  </Button>
                ) : null
              }
            />
            <CardBody className="flex flex-col gap-3">
              {document.notes ? (
                <p className="whitespace-pre-wrap rounded-field bg-card-2 p-3 text-[12px] leading-6 text-fg-muted">
                  {document.notes}
                </p>
              ) : (
                <p className="text-[11.5px] text-fg-subtle">یادداشتی ثبت نشده است.</p>
              )}
              {can('documents.edit') ? (
                <Textarea
                  label="یادداشت جدید"
                  value={noteDraft}
                  placeholder="مثال: نسخه اصل تحویل مشتری شد."
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="اطلاعات پایه" icon="info" />
            <CardBody>
              <InfoList
                items={[
                  { label: 'قالب', value: template?.title ?? '—', icon: 'template' },
                  { label: 'دسته', value: template ? TEMPLATE_CATEGORY_LABELS[template.category] : '—' },
                  { label: 'نسخه قالب', value: displayDigits(document.templateVersion) },
                  { label: 'پرونده', value: document.clientCode ? formatCode(document.clientCode) : '—', icon: 'users' },
                  { label: 'ثبت‌کننده', value: document.createdByName, icon: 'user' },
                  { label: 'آخرین ویرایش', value: formatDate(document.updatedAt, 'datetime'), icon: 'clock' },
                ]}
                columns={1}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ویرایش مقادیر */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="ویرایش مقادیر سند"
        description="تغییرات فقط روی این سند اعمال می‌شود و روی پرونده اثری ندارد."
        icon="edit"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              icon="save"
              onClick={() => {
                updateDocument(document.id, { values: draftValues }, 'ویرایش سند');
                setEditing(false);
                toast.success('سند به‌روزرسانی شد');
              }}
            >
              ذخیره تغییرات
            </Button>
          </>
        }
      >
        {template ? (
          <DynamicFields
            fields={template.fields}
            values={draftValues}
            client={undefined}
            onChange={(key, value) => setDraftValues((prev) => ({ ...prev, [key]: value }))}
          />
        ) : (
          <EmptyState compact icon="alert" title="قالب این سند در دسترس نیست" />
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete}
        onClose={() => setPendingDelete(false)}
        onConfirm={() => {
          deleteDocument(document.id);
          setPendingDelete(false);
          toast.success('سند حذف شد');
          navigate('/documents');
        }}
        title="حذف سند"
        description={`سند ${formatCode(document.number)} و ${displayDigits(documentScans.length)} اسکن پیوست آن حذف می‌شوند. این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
