/* عملیات سند: ساخت متن نهایی، چاپ، خروجی HTML/متن و کپی */

import type { AppSettings, DocRecord, FormTemplate } from '../types';
import { formatDate } from './format';
import { renderDocument } from './template';
import {
  buildDocumentHtml,
  copyText,
  downloadDocumentHtml,
  downloadTextFile,
  printDocumentHtml,
} from './print';
import type { DocumentPrintOptions, SignatureBlock } from './print';
import {
  buildDocumentRequestPrintHtml,
  openDocumentRequestPrintWindow,
} from './documentRequestPrint';

const BLANK = '…………………';

/** تاریخ سند: از فیلدهای قالب، وگرنه تاریخ تنظیم سند */
export function documentDate(document: DocRecord, template: FormTemplate): string {
  const firstDateField = template.fields.find((field) => field.type === 'date' && document.values[field.key]);
  const fallbackKeys = ['doc_date', 'visit_date', 'delivery_date', 'start_date'];
  const key = firstDateField?.key ?? fallbackKeys.find((candidate) => document.values[candidate]);
  return formatDate(key ? document.values[key] : document.createdAt, 'long');
}

/** برچسب امضاها از گروه‌های قالب (فروشنده/خریدار/موجر/مستأجر و ...) */
export function buildSignatureBlocks(template: FormTemplate, values: Record<string, string>): SignatureBlock[] {
  const blocks: SignatureBlock[] = [];
  const seen = new Set<string>();
  template.fields
    .filter((field) => field.group && field.label.startsWith('نام'))
    .forEach((field) => {
      const group = field.group as string;
      if (seen.has(group) || blocks.length >= 2) return;
      seen.add(group);
      blocks.push({ label: group, name: values[field.key] });
    });
  while (blocks.length < 2) {
    blocks.push({ label: blocks.length === 0 ? 'طرف اول' : 'طرف دوم' });
  }
  return blocks;
}

export function buildPrintOptions(
  document: DocRecord,
  template: FormTemplate,
  settings: AppSettings,
): DocumentPrintOptions {
  const rendered = renderDocument(template, document.values, {
    docNumber: document.number,
    clientName: document.clientName,
    clientCode: document.clientCode,
    orgName: settings.orgName,
    date: document.values.doc_date ?? document.createdAt,
    emptyPlaceholder: BLANK,
  });

  return {
    title: document.title,
    docNumber: document.number,
    dateText: documentDate(document, template),
    clientName: document.clientName,
    headerText: rendered.header,
    bodyText: rendered.body,
    footerText: rendered.footer || settings.contractNote,
    org: { name: settings.orgName, phone: settings.orgPhone, address: settings.orgAddress },
    signatures: template.requiresSignature ? buildSignatureBlocks(template, document.values) : [],
  };
}

/** خروجی متنی سند (برای کپی یا فایل txt) */
export function buildPlainText(document: DocRecord, template: FormTemplate, settings: AppSettings): string {
  const rendered = renderDocument(template, document.values, {
    docNumber: document.number,
    clientName: document.clientName,
    clientCode: document.clientCode,
    orgName: settings.orgName,
    date: document.values.doc_date ?? document.createdAt,
    emptyPlaceholder: BLANK,
  });
  return [
    settings.orgName,
    `${document.title} — شماره سند: ${document.number}`,
    document.clientName ? `پرونده: ${document.clientName}` : '',
    `تاریخ: ${documentDate(document, template)}`,
    '--------------------------------------------------',
    rendered.header,
    rendered.body,
    rendered.footer,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function printDocument(document: DocRecord, template: FormTemplate, settings: AppSettings): boolean {
  if (template.printLayout === 'document-request-a4') {
    const printWindow = openDocumentRequestPrintWindow(template, document.values);
    if (!printWindow) return false;
    printWindow.print();
    return true;
  }
  const html = buildDocumentHtml(buildPrintOptions(document, template, settings));
  return printDocumentHtml(html);
}

export function downloadDocumentAsHtml(document: DocRecord, template: FormTemplate, settings: AppSettings) {
  const html =
    template.printLayout === 'document-request-a4'
      ? buildDocumentRequestPrintHtml(template, document.values)
      : buildDocumentHtml(buildPrintOptions(document, template, settings));
  downloadDocumentHtml(`${document.number}.html`, html);
}

export function downloadDocumentAsText(document: DocRecord, template: FormTemplate, settings: AppSettings) {
  const text = buildPlainText(document, template, settings);
  downloadTextFile(`${document.number}.txt`, text);
}

export function copyDocumentText(document: DocRecord, template: FormTemplate, settings: AppSettings): Promise<boolean> {
  return copyText(buildPlainText(document, template, settings));
}
