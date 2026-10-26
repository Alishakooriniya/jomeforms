/* ویرایشگر کانواس فرم — مدیر متن فرم را مستقیم روی خودِ برگه A4 می‌نویسد و
   ویرایش می‌کند (همانند کانواس سربرگ) و با زدن روی برچسب‌های فیلد، فیلدهای متغیر
   یا چک‌باکس‌های انتخابی را در محل نشانگر درج می‌کند. */

import { useEffect, useRef, useState } from 'react';
import type { FormTemplate } from '../../types';
import { SYSTEM_TOKENS } from '../../lib/template';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Icon } from '../ui/Icon';

interface FormCanvasEditorProps {
  template: FormTemplate;
  readOnly?: boolean;
  onChangeBody: (nextBody: string) => void;
}

export function FormCanvasEditor({ template, readOnly = false, onChangeBody }: FormCanvasEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'canvas' | 'raw'>('canvas');

  // وقتی متن از خارج تغییر می‌کند، ویرایشگر را همگام می‌کنیم (اگر فوکوس ندارد)
  useEffect(() => {
    if (!editorRef.current) return;
    if (document.activeElement === editorRef.current) return;
    if (editorRef.current.innerText !== template.body) {
      editorRef.current.innerText = template.body;
    }
  }, [template.body]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    triggerChange();
  };

  const insertTextAtCursor = (textToInsert: string) => {
    editorRef.current?.focus();
    // درج متن ساده در محل مکان‌نما
    const success = document.execCommand('insertText', false, textToInsert);
    if (!success) {
      // پشتیبان در صورتی که execCommand شکست بخورد
      onChangeBody(`${template.body} ${textToInsert}`);
    } else {
      triggerChange();
    }
  };

  const triggerChange = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText;
    onChangeBody(text);
  };

  const isOfficial = template.printLayout === 'document-request-a4' || template.printLayout === 'canvas-a4';

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
      {/* ستون راست (ابزارها و فیلدها) */}
      <div className="flex flex-col gap-4">
        {/* فیلدهای قابل درج */}
        <Card>
          <CardHeader
            title="فیلدهای فرم"
            subtitle="نشانگر را در محل دلخواه روی برگه بگذارید و روی دکمهٔ فیلد بزنید تا درج شود."
            icon="link"
          />
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {template.fields.filter((f) => f.key).length ? (
                template.fields
                  .filter((f) => f.key)
                  .map((field) => (
                    <div key={field.id} className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => insertTextAtCursor(`{{${field.key}}}`)}
                        className="chip transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-300"
                        title={`درج پاسخ «${field.label || field.key}» در متن فرم`}
                      >
                        <Icon name="plus" size={11} />
                        {field.label || field.key}
                      </button>

                      {/* اگر فیلد گزینه‌ای است، چک‌باکس گزینه‌ها را در دسترس می‌گذاریم */}
                      {field.type === 'select' && field.options?.length ? (
                        <div className="mr-2 flex flex-col gap-1 border-r-2 border-line pr-2">
                          {field.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={readOnly}
                              onClick={() => insertTextAtCursor(`{{${field.key}:${opt}}}`)}
                              className="text-start text-[11px] text-fg-muted hover:text-brand-600"
                              title={`درج مربع تیک‌دار برای گزینه «${opt}»`}
                            >
                              ☐ چک‌باکس: {opt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
              ) : (
                <p className="text-[11.5px] text-fg-subtle">
                  ابتدا در مرحلهٔ ۱ پرسش‌های مورد نیاز فرم را تعریف کنید.
                </p>
              )}
            </div>

            {/* نشانه‌های سیستمی */}
            <details className="mt-2 rounded-field border border-line p-2.5">
              <summary className="cursor-pointer text-[12px] font-medium text-fg-muted">
                اطلاعات سیستمی (تاریخ، نام سازمان و ...)
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(SYSTEM_TOKENS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={readOnly}
                    onClick={() => insertTextAtCursor(`{{${key}}}`)}
                    className="chip text-[11px] hover:border-brand-400 hover:text-brand-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          </CardBody>
        </Card>

        {/* نوار قالب‌بندی و حالت ویرایش */}
        <Card>
          <CardHeader title="ابزار نگارش" subtitle="قالب‌بندی متن داخل کانواس برگه" icon="edit" />
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                icon="bold"
                label="درشت‌نویسی (بولد)"
                disabled={readOnly}
                onClick={() => exec('bold')}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="align-right"
                label="راست‌چین"
                disabled={readOnly}
                onClick={() => exec('justifyRight')}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="align-center"
                label="وسط‌چین"
                disabled={readOnly}
                onClick={() => exec('justifyCenter')}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="align-left"
                label="چپ‌چین"
                disabled={readOnly}
                onClick={() => exec('justifyLeft')}
              />
              <span className="mx-1 h-5 w-px bg-line" />
              <Button
                variant={mode === 'canvas' ? 'primary' : 'ghost'}
                size="sm"
                label="ویرایش روی برگه"
                onClick={() => setMode('canvas')}
              />
              <Button
                variant={mode === 'raw' ? 'primary' : 'ghost'}
                size="sm"
                label="متن خام"
                onClick={() => setMode('raw')}
              />
            </div>
            <p className="text-[11px] text-fg-subtle">
              می‌توانید روی برگه مستقیماً تایپ کنید یا هر قسمتی از متن، شرط‌ها یا جملات فرم را به دلخواه خود
              تغییر دهید.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ستون چپ (برگه کانواس A4 واقعی) */}
      <div className="min-w-0">
        {mode === 'raw' ? (
          <div className="card p-4">
            <textarea
              className="field w-full font-mono text-[12.5px] leading-7"
              rows={18}
              dir="rtl"
              disabled={readOnly}
              value={template.body}
              onChange={(e) => onChangeBody(e.target.value)}
            />
          </div>
        ) : (
          <div
            className="form-font relative mx-auto aspect-[210/297] w-full max-w-[170mm] overflow-hidden bg-white text-[#111] shadow-soft [container-type:size]"
            dir="rtl"
          >
            {/* کادر دوبل صفحه */}
            <div
              className="pointer-events-none absolute inset-[8.5mm] border-[1.5px] border-double border-[#171717]"
              aria-hidden="true"
            />

            <div className="relative flex h-full flex-col px-[12mm] py-[10mm] text-[12pt] leading-normal text-[#111]">
              {/* سربرگ مخصوص فرم‌های تقاضا یا عمومی */}
              {isOfficial ? (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col items-start text-left" dir="ltr">
                      <span className="font-sans text-[11pt] leading-tight text-[#111]">FN04</span>
                      <div className="mt-[4mm] text-[12pt] leading-tight text-[#111]" dir="rtl">
                        تاریخ : …………………
                      </div>
                    </div>
                  </div>

                  <div className="mt-[4mm] text-center">
                    <div className="font-sans text-[12pt] text-[#111]">بسمه تعالی</div>
                    <h2 className="mt-[3mm] text-[14pt] font-bold text-[#111]">{template.title}</h2>
                  </div>

                  <div className="mt-[6mm] text-right text-[12pt] font-bold leading-[1.6]">
                    <div>تولیت محترم محبوسات عام المنفعه امام جمعه</div>
                    <div className="mt-[1mm]">سلام علیکم</div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <h2 className="text-[14pt] font-bold text-[#111]">{template.title}</h2>
                </div>
              )}

              {/* کادر کانواس متن — کاربر مستقیماً روی همین بخش تایپ می‌کند */}
              <div className="relative mt-[5mm] flex-1">
                <div
                  ref={editorRef}
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  spellCheck={false}
                  onInput={triggerChange}
                  onPaste={(event) => {
                    event.preventDefault();
                    const text = event.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                    triggerChange();
                  }}
                  className="h-full min-h-[140mm] w-full overflow-y-auto whitespace-pre-wrap text-justify text-[12pt] leading-[2.1] outline-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              {/* امضاء و پی‌نوشت فرم رسمی */}
              {isOfficial ? (
                <>
                  <div className="mt-[8mm] flex justify-start">
                    <div className="w-[60mm] text-right text-[11.5pt] font-bold leading-[1.7]">
                      <div>نام و نام خانوادگی : …………………</div>
                      <div>کد ملی : …………………</div>
                      <div className="mt-[2mm]">امضاء</div>
                    </div>
                  </div>

                  <div className="mt-[10mm] text-right text-[11.5pt] font-bold">
                    <div>نظریه تولیت:</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
