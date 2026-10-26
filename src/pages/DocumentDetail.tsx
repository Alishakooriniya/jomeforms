/* جزئیات سند: پیش‌نمایش در مرکز، گردش کار و اسکن‌ها در کنار.
   مقادیر ثبت‌شده در همان صفحه و به‌صورت تاشو دیده می‌شوند (بدون تب). */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DocStatus } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { DOC_STATUS_LABELS, DOC_STATUS_TONE, TEMPLATE_CATEGORY_LABELS } from '../data/labels';
import { displayDigits, formatCode, formatDate, formatRelative } from '../lib/format';
import { normalizeJalaliDate } from '../lib/jalali';
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
import { Textarea } from '../components/ui/Field';
import { DynamicFields, formatValuePreview } from '../components/form/DynamicFields';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { ScanGallery } from '../components/documents/ScanGallery';

export default function DocumentDetail() {
  const { id = '' } = useParams();
  const { documents, templates, settings, scans } = useDb();
  const { updateDocument, setDocumentStatus, deleteDocument, markPrinted, loadDocumentScans } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  // اسکن‌های این سند تنبل از سرور خوانده می‌شوند
  useEffect(() => {
    if (id) void loadDocumentScans(id);
  }, [id, loadDocumentScans]);

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
      toast.error('فرم این سند در دسترس نیست');
      return;
    }
    const opened = printDocument(document, template, settings);
    if (!opened) {
      toast.warn('پنجره چاپ باز نشد', 'اجازه بازشدن پنجره جدید را در مرورگر فعال کنید.');
      return;
    }
    void markPrinted(document.id).catch(() => undefined);
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
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{document.title}</span>
            <Badge tone={DOC_STATUS_TONE[document.status]} dot>
              {DOC_STATUS_LABELS[document.status]}
            </Badge>
          </span>
        }
        subtitle={
          <span className="num flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>سند {formatCode(document.number)}</span>
            <span className="text-line-strong">•</span>
            {document.clientName && document.clientId ? (
              <button
                type="button"
                className="text-brand-700 hover:underline dark:text-brand-300"
                onClick={() => navigate(`/clients/${document.clientId}`)}
              >
                {document.clientName}
              </button>
            ) : (
              <span>بدون پرونده</span>
            )}
            <span className="text-line-strong">•</span>
            <span>{template?.title ?? 'فرم در دسترس نیست'}</span>
            <span className="text-line-strong">•</span>
            <span>ثبت {formatDate(document.createdAt, 'long')}</span>
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
                  setDraftErrors({});
                  setEditing(true);
                }}
              >
                ویرایش
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
                          void setDocumentStatus(document.id, status)
                            .then(() => toast.success('وضعیت سند تغییر کرد', DOC_STATUS_LABELS[status]))
                            .catch((error: unknown) =>
                              toast.error(error instanceof Error ? error.message : 'تغییر وضعیت انجام نشد.'),
                            );
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* ستون سند */}
        <div className="flex min-w-0 flex-col gap-4">
          <DocumentPreview template={template} values={document.values} document={document} settings={settings} />

          <Card>
            <CardHeader
              title="مقادیر ثبت‌شده"
              subtitle={template ? `بر پایه «${template.title}» نسخه ${displayDigits(template.version)}` : undefined}
              icon="clipboard"
              action={
                template ? (
                  <Button size="sm" variant="ghost" onClick={() => setShowValues((prev) => !prev)}>
                    {showValues ? 'بستن' : 'نمایش مقادیر'}
                  </Button>
                ) : null
              }
            />
            {showValues ? (
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
                  <EmptyState compact icon="alert" title="فرم این سند در دسترس نیست" />
                )}
              </CardBody>
            ) : null}
          </Card>
        </div>

        {/* ستون کناری */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="مسیر سند" subtitle="از ساخت تا بایگانی نهایی" icon="history" />
            <div className="p-4">
              <ol className="flex flex-col">
                {workflow.map((item, index) => (
                  <li key={item.id} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          item.done
                            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white'
                            : 'flex h-6 w-6 items-center justify-center rounded-full bg-card-2 text-fg-subtle'
                        }
                      >
                        <Icon name={item.icon} size={11} bold={item.done} />
                      </span>
                      {index < workflow.length - 1 ? (
                        <span className={item.done ? 'h-6 w-px bg-brand-300' : 'h-6 w-px bg-line'} />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-[11.5px] text-fg">{item.title}</p>
                      <p className="num truncate text-[10px] text-fg-subtle" title={item.at ? formatDate(item.at, 'datetime') : undefined}>
                        {item.at ? formatRelative(item.at) : 'انجام نشده'}
                        {item.done && item.by !== '—' ? ` • ${item.by}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-3 border-t border-line pt-3">
                <InfoList
                  columns={2}
                  items={[
                    { label: 'دسته', value: template ? TEMPLATE_CATEGORY_LABELS[template.category] : '—' },
                    { label: 'ثبت‌کننده', value: document.createdByName },
                    { label: 'آخرین ویرایش', value: formatDate(document.updatedAt, 'datetime') },
                    { label: 'پرونده', value: document.clientCode ? formatCode(document.clientCode) : '—' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="اسکن نسخه امضاشده"
              subtitle={documentScans.length ? `${displayDigits(documentScans.length)} فایل بایگانی‌شده` : 'هنوز بارگذاری نشده'}
              icon="scan"
            />
            <CardBody>
              <ScanGallery document={document} canUpload={can('documents.upload')} canDelete={can('documents.upload')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="یادداشت"
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
                      void updateDocument(document.id, { notes: suffix }, 'افزودن یادداشت')
                        .then(() => {
                          setNoteDraft('');
                          toast.success('یادداشت ثبت شد');
                        })
                        .catch((error: unknown) =>
                          toast.error(error instanceof Error ? error.message : 'ثبت یادداشت انجام نشد.'),
                        );
                    }}
                  >
                    افزودن
                  </Button>
                ) : null
              }
            />
            <CardBody className="flex flex-col gap-2.5">
              {document.notes ? (
                <p className="whitespace-pre-wrap rounded-field bg-card-2 p-2.5 text-[11.5px] leading-6 text-fg-muted">
                  {document.notes}
                </p>
              ) : (
                <p className="text-[11px] text-fg-subtle">یادداشتی ثبت نشده است.</p>
              )}
              {can('documents.edit') ? (
                <Textarea
                  label="یادداشت جدید"
                  className="min-h-16"
                  value={noteDraft}
                  placeholder="مثال: نسخه اصل تحویل مشتری شد."
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
              ) : null}
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
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              icon="save"
              onClick={() => {
                const normalizedValues = { ...draftValues };
                const nextErrors: Record<string, string> = {};
                template?.fields.forEach((field) => {
                  if (field.type !== 'date' || !draftValues[field.key]?.trim()) return;
                  const normalized = normalizeJalaliDate(draftValues[field.key]);
                  if (!normalized) nextErrors[field.key] = 'تاریخ باید شمسی و به‌شکل ۱۴۰۵/۰۷/۳۰ باشد.';
                  else normalizedValues[field.key] = normalized;
                });
                setDraftErrors(nextErrors);
                if (Object.keys(nextErrors).length) {
                  toast.error('تاریخ نامعتبر است', 'تاریخ‌های مشخص‌شده باید شمسی باشند.');
                  return;
                }
                void updateDocument(document.id, { values: normalizedValues }, 'ویرایش سند')
                  .then(() => {
                    setEditing(false);
                    toast.success('سند به‌روزرسانی شد');
                  })
                  .catch((error: unknown) =>
                    toast.error(error instanceof Error ? error.message : 'ویرایش سند انجام نشد.'),
                  );
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
            errors={draftErrors}
            client={undefined}
            onChange={(key, value) => setDraftValues((prev) => ({ ...prev, [key]: value }))}
          />
        ) : (
          <EmptyState compact icon="alert" title="فرم این سند در دسترس نیست" />
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete}
        onClose={() => setPendingDelete(false)}
        onConfirm={() => {
          setPendingDelete(false);
          void deleteDocument(document.id)
            .then(() => {
              toast.success('سند حذف شد');
              navigate('/documents');
            })
            .catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : 'حذف سند انجام نشد.'),
            );
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
