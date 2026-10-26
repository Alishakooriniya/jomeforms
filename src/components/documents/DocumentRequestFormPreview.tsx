/* پیش‌نمایش فرم تقاضای صدور سند (FN04) — دقیقاً با همان استایل چاپ رسمی:
   کادر دوبل پیرامونی، سربرگ FN04، متن جاری فارسی با خطوط متحرک
   که اگر متن متقاضی طولانی باشد به‌طور طبیعی به خط بعدی می‌رود و
   متن‌های بعدی جابه‌جا می‌شوند، بدون همپوشانی یا قطع‌شدن. */

import type { FormTemplate, TemplateField } from '../../types';
import { displayDigits, formatDate } from '../../lib/format';
import { TOKEN_PATTERN } from '../../lib/template';

interface DocumentRequestFormPreviewProps {
  template: FormTemplate;
  values: Record<string, string>;
  isTemplatePreview?: boolean;
}

export function DocumentRequestFormPreview({
  template,
  values,
  isTemplatePreview = false,
}: DocumentRequestFormPreviewProps) {
  const fieldMap = new Map(template.fields.map((field) => [field.key, field]));

  const dateField = template.fields.find((f) => f.key === 'request_date' || f.type === 'date');
  const dateVal = dateField ? values[dateField.key]?.trim() : values.request_date?.trim();
  const dateDisplay = dateVal ? (
    <bdi dir="ltr">{displayDigits(formatDate(dateVal, 'short'))}</bdi>
  ) : isTemplatePreview ? (
    '«تاریخ»'
  ) : (
    '…………………'
  );

  const nameField = template.fields.find((f) => f.key === 'full_name' || f.source === 'fullName');
  const nameVal = nameField ? values[nameField.key]?.trim() : values.full_name?.trim();
  const nameDisplay = nameVal
    ? displayDigits(nameVal)
    : isTemplatePreview
      ? '«نام متقاضی»'
      : '................................';

  const nidField = template.fields.find((f) => f.key === 'national_id' || f.type === 'nationalId');
  const nidVal = nidField ? values[nidField.key]?.trim() : values.national_id?.trim();
  const nidDisplay = nidVal
    ? displayDigits(nidVal)
    : isTemplatePreview
      ? '«کد ملی»'
      : '................';

  // متن قالب را به پاراگراف‌ها تقسیم می‌کنیم
  const paragraphs = template.body
    .trim()
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const renderParagraphContent = (text: string) => {
    // نشانه‌ها را پیدا کرده و با کامپوننت‌های این‌لاین React جایگزین می‌کنیم
    const nodes: Array<string | React.ReactNode> = [];
    let lastIndex = 0;

    const regex = new RegExp(TOKEN_PATTERN.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }
      const rawKey = match[1].trim();

      if (rawKey.includes(':')) {
        const colonIdx = rawKey.indexOf(':');
        const key = rawKey.slice(0, colonIdx).trim();
        const option = rawKey.slice(colonIdx + 1).trim();
        const isSelected = (values[key]?.trim() ?? '') === option;

        nodes.push(
          <span
            key={`${match.index}-${rawKey}`}
            className="inline-flex h-[11pt] w-[11pt] -translate-y-[1.5pt] items-center justify-center border border-[#171717] bg-white mx-1 align-middle"
          >
            {isSelected ? (
              <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
                <path
                  d="M 1.8 5.4 L 4.2 8 L 8.4 2.4"
                  fill="none"
                  stroke="#111"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>,
        );
      } else {
        const field: TemplateField | undefined = fieldMap.get(rawKey);
        const val = values[rawKey]?.trim();

        if (val) {
          nodes.push(
            <span key={`${match.index}-${rawKey}`} className="font-bold text-[#111] px-0.5">
              {displayDigits(val)}
            </span>,
          );
        } else if (isTemplatePreview && field?.label) {
          nodes.push(
            <span key={`${match.index}-${rawKey}`} className="font-bold text-[#1f674c] px-0.5">
              «{field.label}»
            </span>,
          );
        } else {
          nodes.push(
            <span key={`${match.index}-${rawKey}`} className="text-[#777] font-sans text-[11pt] tracking-wider">
              ................................
            </span>,
          );
        }
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  return (
    <div
      className="form-font relative mx-auto aspect-[210/297] w-full max-w-[210mm] overflow-hidden bg-white text-[#111] shadow-soft [container-type:size]"
      dir="rtl"
    >
      {/* کادر دوبل دور صفحه مطابق PDF */}
      <div
        className="pointer-events-none absolute inset-[8.5mm] border-[1.5px] border-double border-[#171717]"
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col px-[13.5mm] py-[12mm] text-[13.5pt] leading-normal text-[#111]">
        {/* فراداده بالا چپ */}
        <div className="absolute top-[13mm] left-[14mm] text-left" dir="ltr">
          <span className="font-sans text-[12pt] leading-tight text-[#111]">FN04</span>
          <div className="mt-[5mm] text-[13.5pt] leading-tight text-[#111]" dir="rtl">
            تاریخ : {dateDisplay}
          </div>
        </div>

        {/* سربرگ وسط */}
        <div className="mt-[12mm] text-center">
          <div className="font-sans text-[13pt] text-[#111]">بسمه تعالی</div>
          <h1 className="mt-[4mm] text-[16pt] font-bold text-[#111]">{template.title}</h1>
        </div>

        {/* مخاطب */}
        <div className="mt-[9mm] text-right font-bold leading-[1.7]">
          <div>تولیت محترم محبوسات عام المنفعه امام جمعه</div>
          <div className="mt-[1.5mm]">سلام علیکم</div>
        </div>

        {/* متن جاری فرم — با قابلیت ری‌فلو و رفتن به خط بعد بدون هیچ همپوشانی */}
        <div className="mt-[5mm] text-justify text-[13.5pt] leading-[2.15]">
          {paragraphs.map((p, idx) => (
            <p key={idx} className="mb-[4mm]">
              {renderParagraphContent(p)}
            </p>
          ))}
        </div>

        {/* بخش امضاء پایین چپ */}
        <div className="mt-[14mm] flex justify-end">
          <div className="w-[65mm] text-right text-[13.5pt] font-bold leading-[1.85]">
            <div>نام و نام خانوادگی : {nameDisplay}</div>
            <div>کد ملی : {nidDisplay}</div>
            <div className="mt-[2mm]">امضاء</div>
            <div className="h-[18mm]" />
          </div>
        </div>

        {/* بخش نظریه تولیت پایین راست */}
        <div className="mt-[18mm] text-right text-[13.5pt] font-bold">
          <div>نظریه تولیت:</div>
        </div>
      </div>
    </div>
  );
}
