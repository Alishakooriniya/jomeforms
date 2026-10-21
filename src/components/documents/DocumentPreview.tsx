/* پیش‌نمایش سند روی صفحه — همان چیزی که چاپ می‌شود.
   کاغذ همیشه سفید می‌ماند تا در حالت تاریک هم قابل خواندن باشد. */

import type { AppSettings, DocRecord, FormTemplate } from '../../types';
import { formatCode, formatDate } from '../../lib/format';
import { renderDocument } from '../../lib/template';
import { buildSignatureBlocks, documentDate } from '../../lib/documentActions';
import { EmptyState } from '../ui/EmptyState';
import { DocumentRequestFormPreview } from './DocumentRequestFormPreview';

export interface DocumentPreviewProps {
  template?: FormTemplate;
  values: Record<string, string>;
  document?: DocRecord;
  settings: AppSettings;
  /** در حالت پیش‌نمایش قالب، جاهای خالی با نقطه‌چین نشان داده می‌شود */
  isTemplatePreview?: boolean;
}

export function DocumentPreview({ template, values, document, settings, isTemplatePreview }: DocumentPreviewProps) {
  if (!template) {
    return <EmptyState icon="file" title="قالب سند پیدا نشد" description="ممکن است این قالب حذف شده باشد." />;
  }
  if (template.printLayout === 'document-request-a4') {
    return <DocumentRequestFormPreview template={template} values={values} />;
  }

  const rendered = renderDocument(template, values, {
    docNumber: document?.number,
    clientName: document?.clientName,
    clientCode: document?.clientCode,
    orgName: settings.orgName,
    date: values.doc_date ?? values.visit_date ?? document?.createdAt,
    emptyPlaceholder: isTemplatePreview ? '' : '…………………',
  });

  const signatures = template.requiresSignature ? buildSignatureBlocks(template, values) : [];
  const dateText = document ? documentDate(document, template) : formatDate(values.doc_date, 'long');

  return (
    <div className="mx-auto w-full max-w-[210mm] rounded-card border border-line bg-white p-6 text-[#171717] shadow-soft sm:p-8">
      {/* سرصفحه سازمان */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#24815d] pb-2.5">
        <div>
          <p className="text-[15px] font-bold text-[#1f674c]">{settings.orgName}</p>
          <p className="mt-0.5 text-[10.5px] leading-5 text-[#565656]">{settings.orgAddress}</p>
        </div>
        <div className="text-end text-[10.5px] leading-5 text-[#565656]">
          {settings.orgPhone ? <p>تلفن: {settings.orgPhone}</p> : null}
          <p>تاریخ: {dateText}</p>
        </div>
      </div>

      {/* فراداده */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-[#565656]">
        <span>{document?.clientName ? `پرونده: ${document.clientName}` : ''}</span>
        <span>{document?.number ? `شماره سند: ${formatCode(document.number)}` : ''}</span>
      </div>

      <h2 className="my-4 text-center text-[15px] font-bold">{document?.title ?? template.title}</h2>

      {rendered.header ? (
        <p className="mb-3 rounded-[6px] border border-[#d1d1d1] bg-[#f5f5f5] px-3 py-2 text-[11.5px] leading-6">
          {rendered.header}
        </p>
      ) : null}

      <div className="whitespace-pre-wrap text-justify text-[12px] leading-7">{rendered.body}</div>

      {rendered.footer ? (
        <p className="mt-4 border-t border-dashed border-[#d1d1d1] pt-2 text-[10.5px] leading-6 text-[#565656]">
          {rendered.footer}
        </p>
      ) : null}

      {signatures.length ? (
        <div className="mt-8 flex flex-wrap gap-4">
          {signatures.map((signature) => (
            <div key={signature.label} className="min-w-40 flex-1 rounded-[6px] border border-[#d1d1d1] p-2.5">
              <p className="text-[11px] font-medium">{signature.label}</p>
              <div className="h-12" />
              <p className="text-[10px] text-[#565656]">{signature.name || 'نام و امضا'}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
