/* پیش‌نمایش سربرگ — همان چیدمان چاپ (lib/letterheadPrint.ts): تصویر قاب
   استخراج‌شده از PDF اصلی + لایه مقادیر فیلدها + متن نامه + کادر نشانی.
   با editing=true کادر میانی به کانواس ویرایش (contentEditable) تبدیل می‌شود
   تا نامه مستقیم روی خود سربرگ نوشته شود. */

import type { RefObject } from 'react';
import { displayDigits } from '../../lib/format';
import {
  LETTERHEAD_FRAME_URL,
  LETTERHEAD_LAYOUT,
  LETTERHEAD_META_FIELDS,
  sanitizeLetterHtml,
} from '../../lib/letterheadPrint';
import type { LetterheadValues } from '../../lib/letterheadPrint';

interface LetterheadPreviewProps {
  /** نشانی کادر پایین — از GET /letterhead می‌آید */
  address: string;
  values: LetterheadValues;
  /** پیش‌نمایش نسخه خالی: فقط قاب و نشانی، بدون فیلد و متن */
  blank?: boolean;
  /** کادر میانی قابل‌ویرایش شود */
  editing?: boolean;
  editorRef?: RefObject<HTMLDivElement | null>;
  /** HTML فعلی متن نامه به والد برمی‌گردد */
  onBodyInput?: (html: string) => void;
  className?: string;
}

const L = LETTERHEAD_LAYOUT;

export function LetterheadPreview({
  address,
  values,
  blank = false,
  editing = false,
  editorRef,
  onBodyInput,
  className,
}: LetterheadPreviewProps) {
  const bodyHtml = sanitizeLetterHtml(values.body ?? '');

  return (
    <div
      className={`form-font relative mx-auto aspect-[210/297] w-full max-w-[210mm] overflow-hidden bg-white text-[#111] shadow-soft [container-type:size] ${className ?? ''}`}
      dir="rtl"
    >
      <img
        src={LETTERHEAD_FRAME_URL}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
      />
      {!blank
        ? LETTERHEAD_META_FIELDS.map((field) => {
            const value = values[field.key as keyof LetterheadValues]?.trim();
            if (!value) return null;
            return (
              <div
                key={field.key}
                dir="ltr"
                className="absolute overflow-hidden whitespace-nowrap text-right font-bold"
                style={{
                  top: `${field.top}%`,
                  left: `${L.meta.left}%`,
                  width: `${L.meta.width}%`,
                  fontSize: `${L.meta.fontSize}cqw`,
                  lineHeight: 1.2,
                }}
              >
                {displayDigits(value)}
              </div>
            );
          })
        : null}
      {!blank ? (
        editing ? (
          <div
            ref={editorRef}
            className="letterhead-editor absolute overflow-y-auto outline-none"
            dir="rtl"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            style={{
              top: `${L.body.top}%`,
              bottom: `${L.body.bottom}%`,
              left: `${L.body.left}%`,
              right: `${L.body.right}%`,
              fontSize: `${L.body.fontSize}cqw`,
              lineHeight: L.body.lineHeight,
            }}
            onInput={(event) => {
              const el = event.currentTarget;
              const html = el.innerHTML === '<br>' ? '' : el.innerHTML;
              onBodyInput?.(html);
            }}
            onPaste={(event) => {
              // فقط متن ساده — قالب‌بندی خارجی وارد سربرگ نشود
              event.preventDefault();
              const text = event.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : bodyHtml ? (
          <div
            className="absolute overflow-hidden"
            style={{
              top: `${L.body.top}%`,
              bottom: `${L.body.bottom}%`,
              left: `${L.body.left}%`,
              right: `${L.body.right}%`,
              fontSize: `${L.body.fontSize}cqw`,
              lineHeight: L.body.lineHeight,
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null
      ) : null}
      <div
        className="absolute flex items-center justify-start overflow-hidden border border-[#171717] bg-white text-right font-bold"
        style={{
          top: `${L.footer.top}%`,
          height: `${L.footer.height}%`,
          left: `${L.footer.left}%`,
          right: `${L.footer.right}%`,
          borderRadius: `${L.footer.radius}cqw`,
          borderWidth: `${L.footer.border}cqw`,
          padding: '0 1.2cqw',
          fontSize: `${L.footer.fontSize}cqw`,
          lineHeight: L.footer.lineHeight,
        }}
      >
        <span className="block w-full whitespace-pre-wrap">{address}</span>
      </div>
    </div>
  );
}
