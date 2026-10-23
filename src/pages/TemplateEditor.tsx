/* سازنده قالب فرم — سوپرادمین فرم‌های واقعی را همین‌جا می‌سازد */

import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FieldType, FormTemplate, TemplateCategory, TemplateField } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import {
  FIELD_TYPE_OPTIONS,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_OPTIONS,
} from '../data/labels';
import { displayDigits } from '../lib/format';
import { analyzeTokens, CLIENT_SOURCES, createTemplateFieldKey, previewValues, SYSTEM_TOKENS } from '../lib/template';
import { uid } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Checkbox, FormGrid, NumberInput, Switch } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Select, TextInput, Textarea } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { DocumentPreview } from '../components/documents/DocumentPreview';

function emptyField(): TemplateField {
  return {
    id: uid('tf'),
    key: '',
    label: '',
    type: 'text',
    required: false,
  };
}

function emptyTemplate(): Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    title: '',
    category: 'other',
    description: '',
    fields: [emptyField()],
    body: '',
    headerNote: '',
    footerNote: '',
    requiresSignature: true,
    active: true,
    version: 1,
  };
}

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { templates, settings } = useDb();
  const { saveTemplate } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();

  const existing = id ? templates.find((item) => item.id === id) : undefined;
  const [draft, setDraft] = useState(() => (existing ? { ...existing } : emptyTemplate()));
  const [tab, setTab] = useState('fields');
  const [discarding, setDiscarding] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const readOnly = Boolean(existing && !can('templates.edit'));
  const tokens = useMemo(() => analyzeTokens({ body: draft.body, fields: draft.fields }), [draft.body, draft.fields]);
  const unusedFields = tokens.filter((token) => token.inFields && !token.used && token.key);
  const unknownTokens = tokens.filter((token) => !token.inFields && !(token.key in SYSTEM_TOKENS));

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const updateField = (fieldId: string, patch: Partial<TemplateField>) => {
    const current = draft.fields.find((field) => field.id === fieldId);
    const nextPatch =
      current && patch.label !== undefined && !current.key && patch.label.trim()
        ? { ...patch, key: createTemplateFieldKey(patch.label, draft.fields) }
        : patch;
    set(
      'fields',
      draft.fields.map((field) => (field.id === fieldId ? { ...field, ...nextPatch } : field)),
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const next = [...draft.fields];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('fields', next);
  };

  const insertToken = (token: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      set('body', `${draft.body}{{${token}}}`);
      return;
    }
    const start = textarea.selectionStart ?? draft.body.length;
    const end = textarea.selectionEnd ?? start;
    const nextBody = `${draft.body.slice(0, start)}{{${token}}}${draft.body.slice(end)}`;
    set('body', nextBody);
    requestAnimationFrame(() => {
      textarea.focus();
      const position = start + token.length + 4;
      textarea.setSelectionRange(position, position);
    });
  };

  const validate = (): string | null => {
    if (draft.title.trim().length < 2) return 'عنوان قالب باید دست‌کم دو حرف داشته باشد.';
    if (!draft.body.trim()) return 'متن قالب را وارد کنید.';
    if (!draft.fields.length) return 'حداقل یک فیلد به فرم اضافه کنید.';
    if (draft.fields.some((field) => !field.label.trim())) return 'برای همه فیلدها یک عنوان وارد کنید.';
    const keys = draft.fields.map((field) => field.key.trim());
    if (new Set(keys).size !== keys.length) return 'نامک فیلدها باید یکتا باشد.';
    const invalid = draft.fields.find((field) => field.key.trim() && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.key));
    if (invalid || keys.some((key) => !key)) return 'عنوان فیلد را دوباره وارد کنید تا شناسهٔ آن ساخته شود.';
    const missingOptions = draft.fields.find(
      (field) => field.type === 'select' && !field.options?.some((option) => option.trim()),
    );
    if (missingOptions) return `برای فیلد «${missingOptions.label}» دست‌کم یک گزینه وارد کنید.`;
    return null;
  };

  const submit = () => {
    const error = validate();
    if (error) {
      toast.error('ذخیره نشد', error);
      setTab('fields');
      return;
    }
    const saved = saveTemplate(
      {
        ...draft,
        fields: draft.fields
          .map((field) => ({ ...field, key: field.key.trim(), label: field.label.trim() })),
      },
      existing?.id,
    );
    toast.success(existing ? 'قالب ویرایش شد' : 'قالب ساخته شد', saved.title);
    navigate('/templates');
  };

  if (id && !existing) {
    return (
      <div className="card">
        <EmptyState
          icon="alert"
          title="قالب پیدا نشد"
          action={
            <Button to="/templates" variant="primary" icon="template">
              بازگشت به فهرست قالب‌ها
            </Button>
          }
        />
      </div>
    );
  }

  const previewSample = previewValues(draft.fields);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={existing ? `ویرایش قالب: ${existing.title}` : 'افزودن قالب فرم جدید'}
        subtitle="سه قدم کوتاه: مشخصات فرم، پرسش‌ها و متن نهایی."
        icon="template"
        breadcrumbs={[
          { label: 'داشبورد', to: '/' },
          { label: 'قالب فرم‌ها', to: '/templates' },
          { label: existing ? existing.title : 'قالب جدید' },
        ]}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/templates')}>
              بازگشت
            </Button>
            {!readOnly ? (
              <Button variant="primary" icon="save" onClick={submit}>
                {existing ? 'ذخیره تغییرات' : 'ساخت قالب'}
              </Button>
            ) : null}
          </>
        }
      />

      {readOnly ? (
        <p className="flex items-center gap-2 rounded-card border border-line bg-warn-soft px-3 py-2 text-[12px] text-warn-fg">
          <Icon name="lock" size={14} />
          برای ویرایش این قالب به دسترسی «ویرایش قالب» نیاز دارید. فقط مشاهده در دسترس است.
        </p>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'fields', label: '۱. مشخصات و فیلدها', icon: 'list', count: draft.fields.length },
          { id: 'body', label: '۲. متن فرم', icon: 'file-text' },
          { id: 'preview', label: '۳. پیش‌نمایش', icon: 'eye' },
        ]}
      />

      {tab === 'fields' ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="۱. نام و دسته‌بندی فرم" subtitle="این اطلاعات برای پیدا کردن فرم در فهرست استفاده می‌شود." icon="info" />
            <CardBody>
              <FormGrid columns={2}>
                <TextInput
                  label="عنوان قالب"
                  required
                  value={draft.title}
                  disabled={readOnly}
                  onChange={(event) => set('title', event.target.value)}
                  placeholder="مثال: قرارداد اجاره واحد تجاری"
                />
                <Select
                  label="دسته‌بندی"
                  value={draft.category}
                  disabled={readOnly}
                  options={TEMPLATE_CATEGORY_OPTIONS}
                  onChange={(event) => set('category', event.target.value as TemplateCategory)}
                />
                <Textarea
                  label="توضیح کوتاه"
                  containerClassName="md:col-span-2"
                  className="min-h-14"
                  disabled={readOnly}
                  value={draft.description ?? ''}
                  onChange={(event) => set('description', event.target.value)}
                />
              </FormGrid>
              <details className="mt-4 rounded-field border border-line px-3 py-2.5">
                <summary className="cursor-pointer text-[12px] font-medium text-fg-muted">تنظیمات بیشتر</summary>
                <div className="mt-3 flex flex-col gap-4">
                  <FormGrid columns={2}>
                    <Textarea
                      label="یادداشت بالای سند"
                      className="min-h-14"
                      disabled={readOnly}
                      value={draft.headerNote ?? ''}
                      onChange={(event) => set('headerNote', event.target.value)}
                      hint="اختیاری"
                    />
                    <Textarea
                      label="یادداشت پایین سند"
                      className="min-h-14"
                      disabled={readOnly}
                      value={draft.footerNote ?? ''}
                      onChange={(event) => set('footerNote', event.target.value)}
                      hint="اختیاری"
                    />
                  </FormGrid>
                  <div className="flex flex-wrap gap-6">
                    <Switch
                      checked={draft.requiresSignature}
                      disabled={readOnly}
                      label="این سند به امضا نیاز دارد"
                      onChange={(checked) => set('requiresSignature', checked)}
                    />
                    <Switch
                      checked={draft.active}
                      disabled={readOnly}
                      label="نمایش در فهرست ساخت سند"
                      onChange={(checked) => set('active', checked)}
                    />
                  </div>
                </div>
              </details>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="۲. پرسش‌های فرم"
              subtitle="عنوان پرسش را بنویسید؛ همین عنوان در ساخت فرم و چاپ استفاده می‌شود."
              icon="list"
              action={
                !readOnly ? (
                  <Button size="sm" variant="soft" icon="plus" onClick={() => set('fields', [...draft.fields, emptyField()])}>
                    افزودن فیلد
                  </Button>
                ) : null
              }
            />
            <CardBody className="flex flex-col gap-3">
              {draft.fields.map((field, index) => (
                <div key={field.id} className="rounded-card border border-line bg-card-2/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[12px] text-fg-muted">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-[10.5px]">
                        {displayDigits(index + 1)}
                      </span>
                      فیلد {field.label || 'بی‌نام'}
                      {field.required ? (
                        <Badge tone="danger" size="sm">
                          الزامی
                        </Badge>
                      ) : null}
                    </span>
                    {!readOnly ? (
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          icon="chevron-up"
                          label="جابه‌جایی به بالا"
                          disabled={index === 0}
                          onClick={() => moveField(index, -1)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          icon="chevron-down"
                          label="جابه‌جایی به پایین"
                          disabled={index === draft.fields.length - 1}
                          onClick={() => moveField(index, 1)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          icon="trash"
                          label="حذف فیلد"
                          className="hover:text-danger-fg"
                          onClick={() => set('fields', draft.fields.filter((item) => item.id !== field.id))}
                        />
                      </div>
                    ) : null}
                  </div>

                  <FormGrid columns={2}>
                    <TextInput
                      label="عنوان فیلد"
                      required
                      value={field.label}
                      disabled={readOnly}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                      placeholder="مثلاً نام و نام خانوادگی"
                    />
                    <Select
                      label="نوع پاسخ"
                      value={field.type}
                      disabled={readOnly}
                      options={FIELD_TYPE_OPTIONS}
                      onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}
                    />
                    {field.type === 'select' ? (
                      <TextInput
                        label="گزینه‌های قابل انتخاب"
                        value={(field.options ?? []).join('، ')}
                        disabled={readOnly}
                        placeholder="مثلاً نقدی، اقساطی"
                        hint="گزینه‌ها را با ویرگول جدا کنید."
                        onChange={(event) =>
                          updateField(field.id, {
                            options: event.target.value
                              .split(/[،,]/)
                              .map((option) => option.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    ) : null}
                  </FormGrid>
                  <div className="mt-3 flex flex-col gap-3">
                    <Checkbox
                      label="پاسخ به این پرسش الزامی است"
                      checked={field.required}
                      disabled={readOnly}
                      onChange={(event) => updateField(field.id, { required: event.target.checked })}
                    />
                    <details className="rounded-field border border-line px-3 py-2">
                      <summary className="cursor-pointer text-[11.5px] font-medium text-fg-muted">تنظیمات بیشتر این فیلد</summary>
                      <FormGrid columns={2} className="mt-3">
                        <Select
                          label="پرکردن خودکار از پرونده"
                          value={field.source ?? ''}
                          disabled={readOnly}
                          placeholder="بدون پرکردن خودکار"
                          options={CLIENT_SOURCES.map((source) => ({
                            value: source.key,
                            label: `${source.group} — ${source.label}`,
                          }))}
                          onChange={(event) => updateField(field.id, { source: event.target.value || undefined })}
                        />
                        <TextInput
                          label="گروه"
                          value={field.group ?? ''}
                          disabled={readOnly}
                          placeholder="مثلاً خریدار"
                          onChange={(event) => updateField(field.id, { group: event.target.value || undefined })}
                        />
                        <TextInput
                          label="واحد"
                          value={field.suffix ?? ''}
                          disabled={readOnly}
                          placeholder="مثلاً تومان"
                          onChange={(event) => updateField(field.id, { suffix: event.target.value || undefined })}
                        />
                        <TextInput
                          label="راهنمای پاسخ"
                          value={field.help ?? ''}
                          disabled={readOnly}
                          onChange={(event) => updateField(field.id, { help: event.target.value || undefined })}
                        />
                        {field.type === 'number' ? (
                          <NumberInput
                            label="مقدار پیش‌فرض"
                            value={field.defaultValue ?? ''}
                            disabled={readOnly}
                            onChange={(value) => updateField(field.id, { defaultValue: value })}
                          />
                        ) : null}
                        <TextInput
                          label="متن نمونه داخل کادر"
                          value={field.placeholder ?? ''}
                          disabled={readOnly}
                          onChange={(event) => updateField(field.id, { placeholder: event.target.value || undefined })}
                        />
                      </FormGrid>
                    </details>
                  </div>
                </div>
              ))}

              {!draft.fields.length ? (
                <EmptyState
                  compact
                  icon="list"
                  title="فیلدی تعریف نشده است"
                  action={
                    !readOnly ? (
                      <Button size="sm" variant="soft" icon="plus" onClick={() => set('fields', [emptyField()])}>
                        افزودن فیلد
                      </Button>
                    ) : null
                  }
                />
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'body' ? (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader title="متن فرم" subtitle="متن قرارداد یا فرم را بنویسید؛ برای درج پاسخ‌ها از دکمه‌های کناری استفاده کنید." icon="file-text" />
            <CardBody>
              <Textarea
                ref={bodyRef}
                label="متن چاپ‌شونده"
                required
                className="min-h-[420px] text-[12.5px] leading-7"
                value={draft.body}
                disabled={readOnly}
                onChange={(event) => set('body', event.target.value)}
                placeholder={'ماده ۱ — طرفین قرارداد\nفروشنده: ...\n\nماده ۲ — موضوع قرارداد\n...'}
              />
              <p className="mt-2 text-[11px] text-fg-subtle">
                نشانگر را در محل دلخواه بگذارید و روی عنوان هر فیلد بزنید تا پاسخ آن‌جا درج شود.
              </p>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="درج پاسخ در متن" subtitle="برای اضافه‌کردن، روی عنوان پرسش بزنید." icon="link" />
              <CardBody className="flex flex-wrap gap-1.5">
                {draft.fields.filter((field) => field.key).length ? (
                  draft.fields
                    .filter((field) => field.key)
                    .map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => insertToken(field.key)}
                        className="chip transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-300"
                        title={`درج پاسخ «${field.label || field.key}» در متن`}
                      >
                        <Icon name="plus" size={11} />
                        {field.label || field.key}
                      </button>
                    ))
                ) : (
                  <p className="text-[11.5px] text-fg-subtle">ابتدا در مرحلهٔ مشخصات، پرسش اضافه کنید.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="اطلاعات خودکار (اختیاری)" subtitle="تاریخ و شماره سند" icon="sparkles" />
              <CardBody>
                <details>
                  <summary className="cursor-pointer text-[12px] font-medium text-fg-muted">انتخاب اطلاعات خودکار</summary>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(SYSTEM_TOKENS).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={readOnly}
                        onClick={() => insertToken(key)}
                        className="chip transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-300"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </details>
              </CardBody>
            </Card>

            {unknownTokens.length || unusedFields.length ? (
              <Card>
                <CardHeader title="موارد نیازمند توجه" icon="alert" />
                <CardBody className="flex flex-col gap-2 text-[11.5px]">
                  {unknownTokens.map((token) => (
                    <p key={token.key} className="flex items-start gap-1.5 text-warn-fg">
                      <Icon name="alert" size={13} />
                      یک بخش از متن به فیلد پاسخ متصل نیست و در چاپ خالی می‌ماند:{' '}
                      <span dir="ltr">{`{{${token.key}}}`}</span>
                    </p>
                  ))}
                  {unusedFields.map((token) => (
                    <p key={token.key} className="flex items-start gap-1.5 text-fg-muted">
                      <Icon name="info" size={13} />
                      فیلد «{token.label}» در متن استفاده نشده است.
                    </p>
                  ))}
                </CardBody>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'preview' ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
            <Icon name="info" size={13} />
            پیش‌نمایش با مقادیر نمونه ({displayDigits(draft.fields.length)} فیلد) — دسته: {TEMPLATE_CATEGORY_LABELS[draft.category]}
            {draft.printLayout === 'document-request-a4' ? ' • متن و فیلدها قابل‌ویرایش‌اند؛ کادر و اندازهٔ A4 ثابت است.' : null}
          </p>
          <DocumentPreview
            template={{ ...draft, id: existing?.id ?? 'preview' } as FormTemplate}
            values={previewSample}
            settings={settings}
            isTemplatePreview
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={discarding}
        onClose={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          navigate('/templates');
        }}
        title="انصراف از تغییرات"
        description="تغییرات ذخیره‌نشده از بین می‌رود."
        confirmLabel="انصراف از تغییرات"
        variant="danger"
        icon="alert"
      />

      {!readOnly ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
          <p className="text-[11.5px] text-fg-subtle">
            {displayDigits(draft.fields.filter((field) => field.key).length)} پرسش •{' '}
            {displayDigits(analyzeTokens({ body: draft.body, fields: draft.fields }).filter((token) => token.inFields && token.used).length)} پاسخ درج‌شده در متن
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setDiscarding(true)}>
              انصراف
            </Button>
            <Button variant="primary" icon="save" onClick={submit}>
              {existing ? 'ذخیره تغییرات' : 'ساخت قالب'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
