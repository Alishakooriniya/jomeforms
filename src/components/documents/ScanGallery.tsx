/* گالری اسکن‌های امضاشده: بارگذاری، پیش‌نمایش، دانلود و حذف.
   فایل‌ها روی سرور نگه‌داری می‌شوند و با درخواست احرازشده واکشی می‌شوند. */

import { useEffect, useRef, useState } from 'react';
import type { DocRecord, ScanFile } from '../../types';
import { formatBytes, formatDate } from '../../lib/format';
import { api } from '../../lib/apiClient';
import { cn } from '../../lib/utils';
import { useDb, useDbActions } from '../../store/DataProvider';
import { useToast } from '../../store/ToastProvider';
import { Button } from '../ui/Button';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

/** ساخت آدرس موقت تصاویر از سرور */
function useScanUrls(documentId: string, scans: ScanFile[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const scan of scans) {
        try {
          const blob = await api.documents.scanBlob(documentId, scan.id);
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[scan.id] = url;
        } catch {
          /* پیش‌نمایش در دسترس نیست */
        }
      }
      if (cancelled) created.forEach((url) => URL.revokeObjectURL(url));
      else setUrls(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documentId, scans]);

  return urls;
}

export interface ScanGalleryProps {
  document: DocRecord;
  canUpload: boolean;
  canDelete: boolean;
}

export function ScanGallery({ document, canUpload, canDelete }: ScanGalleryProps) {
  const { scans } = useDb();
  const { addScan, deleteScan, loadDocumentScans } = useDbActions();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<ScanFile | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScanFile | null>(null);

  useEffect(() => {
    void loadDocumentScans(document.id);
  }, [document.id, loadDocumentScans]);

  const documentScans = scans.filter((scan) => scan.documentId === document.id);
  const urls = useScanUrls(document.id, documentScans);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    if (!list.length) {
      toast.warn('فقط تصویر یا PDF قابل بارگذاری است.');
      return;
    }
    setUploading(true);
    let done = 0;
    for (const file of list) {
      try {
        const created = await addScan(document.id, file);
        if (created) done += 1;
      } catch {
        /* خطا در پایان گزارش می‌شود */
      }
    }
    setUploading(false);
    if (done) toast.success(`${done} فایل بارگذاری شد`, 'وضعیت سند به «اسکن‌شده» تغییر کرد.');
    else toast.error('بارگذاری ناموفق بود.');
  };

  return (
    <div className="flex flex-col gap-3">
      {canUpload ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files?.length) void upload(event.dataTransfer.files);
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-card border border-dashed p-4 text-center transition-colors',
            dragging ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-line-strong bg-card-2/40',
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-fg-muted">
            <Icon name="scan" size={19} />
          </span>
          <p className="text-[12.5px] font-medium text-fg">بارگذاری نسخه اسکن‌شده امضاشده</p>
          <p className="text-[11px] text-fg-subtle">
            تصاویر (JPG/PNG) یا PDF را بکشید و رها کنید — قبل از ذخیره فشرده می‌شوند.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) void upload(event.target.files);
              event.target.value = '';
            }}
          />
          <Button
            size="sm"
            variant="soft"
            icon="upload"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            انتخاب فایل
          </Button>
        </div>
      ) : null}

      {documentScans.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documentScans.map((scan) => (
            <li key={scan.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setPreview(scan)}
                className="block h-36 w-full bg-card-2"
                aria-label={`پیش‌نمایش ${scan.name}`}
              >
                {urls[scan.id] ? (
                  <img src={urls[scan.id]} alt={scan.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-fg-subtle">
                    <Icon name="file" size={22} />
                    <span className="text-[10.5px]">پیش‌نمایش ندارد</span>
                  </span>
                )}
              </button>
              <div className="flex flex-col gap-1 border-t border-line p-2.5">
                <p className="truncate text-[11.5px] text-fg" title={scan.name}>
                  {scan.name}
                </p>
                <p className="num text-[10.5px] text-fg-subtle">
                  {formatBytes(scan.size)} • {formatDate(scan.uploadedAt, 'datetime')}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10.5px] text-fg-subtle">{scan.uploadedBy}</span>
                  <div className="flex items-center gap-0.5">
                    {urls[scan.id] ? (
                      <a
                        href={urls[scan.id]}
                        download={scan.name}
                        className="btn btn-ghost btn-icon"
                        aria-label="دانلود"
                        title="دانلود"
                      >
                        <Icon name="download" size={15} />
                      </a>
                    ) : null}
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        icon="trash"
                        label="حذف اسکن"
                        className="hover:text-danger-fg"
                        onClick={() => setPendingDelete(scan)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="scan"
          compact
          title="اسکنی بارگذاری نشده است"
          description={
            canUpload
              ? 'پس از امضای سند، تصویر یا فایل PDF آن را اینجا بارگذاری کنید تا در پرونده بایگانی شود.'
              : 'برای بارگذاری اسکن، دسترسی «بارگذاری اسکن امضاشده» لازم است.'
          }
        />
      )}

      {/* پیش‌نمایش بزرگ */}
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name}
        description={preview ? `بارگذاری‌شده در ${formatDate(preview.uploadedAt, 'datetime')}` : undefined}
        icon="scan"
        size="xl"
        footer={
          <>
            {preview && urls[preview.id] ? (
              <a href={urls[preview.id]} download={preview.name} className="btn btn-secondary btn-md">
                <Icon name="download" size={15} />
                دانلود فایل
              </a>
            ) : null}
            <Button variant="ghost" onClick={() => setPreview(null)}>
              بستن
            </Button>
          </>
        }
      >
        {preview ? (
          urls[preview.id] ? (
            preview.mime === 'application/pdf' ? (
              <iframe src={urls[preview.id]} title={preview.name} className="h-[70vh] w-full rounded-field" />
            ) : (
              <img
                src={urls[preview.id]}
                alt={preview.name}
                className="mx-auto max-h-[70vh] w-auto rounded-field border border-line"
              />
            )
          ) : (
            <EmptyState icon="alert" title="فایل در دسترس نیست" description="فایل این اسکن از سرور دریافت نشد." />
          )
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteScan(pendingDelete.id)
              .then(() => toast.success('اسکن حذف شد'))
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'حذف اسکن انجام نشد.'),
              );
          }
          setPendingDelete(null);
        }}
        title="حذف اسکن"
        description="این فایل از بایگانی حذف می‌شود و قابل بازیابی نیست. مطمئن هستید؟"
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
