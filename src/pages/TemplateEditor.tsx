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
import { analyzeTokens, CLIENT_SOURCES, previewValues, SYSTEM_TOKENS } from '../lib/template';
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
    body: 'ماده ۱ — طرفین\nنام: {{}}\n\nماده ۲ — موضوع\n',
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
  const unknownTokens = tokens.filter((token) => !token.inFields);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const updateField = (fieldId: string, patch: Partial<TemplateField>) => {
    set(
      'fields',
      draft.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
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
    if (!draft.title.trim()) return 'عنوان قالب را وارد کنید.';
    if (!draft.body.trim()) return 'متن قالب را وارد کنید.';
    const keys = draft.fields.map((field) => field.key.trim()).filter(Boolean);
    if (!keys.length) return 'حداقل یک فیلد با نامک انگلیسی لازم است.';
    if (new Set(keys).size !== keys.length) return 'نامک فیلدها باید یکتا باشد.';
    const invalid = draft.fields.find((field) => field.key.trim() && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.key));
    if (invalid) return 'نامک فیلد فقط با حروف انگلیسی، عدد و زیرخط مجاز است.';
    const missingLabel = draft.fields.find((field) => field.key.trim() && !field.label.trim());
    if (missingLabel) return 'برای هر فیلد، برچسب فارسی وارد کنید.';
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
          .filter((field) => field.key.trim())
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
        subtitle="فیلدها را تعریف کنید و متن فرم را با نشانه‌های {{نامک}} بنویسید تا از پرونده پر شود."
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
          { id: 'fields', label: 'مشخصات و فیلدها', icon: 'list', count: draft.fields.length },
          { id: 'body', label: 'متن فرم', icon: 'file-text' },
          { id: 'preview', label: 'پیش‌نمایش', icon: 'eye' },
        ]}
      />

      {tab === 'fields' ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="مشخصات قالب" icon="info" />
            <CardBody>
              <FormGrid columns={3}>
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
                <TextInput
                  label="نسخه"
                  value={String(draft.version)}
                  disabled
                  hint="با هر تغییر ساختاری افزایش دهید"
                />
                <Textarea
                  label="توضیح کوتاه"
                  containerClassName="md:col-span-3"
                  className="min-h-16"
                  disabled={readOnly}
                  value={draft.description ?? ''}
                  onChange={(event) => set('description', event.target.value)}
                />
                <Textarea
                  label="یادداشت بالای سند"
                  containerClassName="md:col-span-3"
                  className="min-h-16"
                  disabled={readOnly}
                  value={draft.headerNote ?? ''}
                  onChange={(event) => set('headerNote', event.target.value)}
                  hint="می‌توانید از نشانه‌ها هم استفاده کنید"
                />
                <Textarea
                  label="یادداشت پایین سند"
                  containerClassName="md:col-span-3"
                  className="min-h-16"
                  disabled={readOnly}
                  value={draft.footerNote ?? ''}
                  onChange={(event) => set('footerNote', event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-6 md:col-span-3">
                  <Switch
                    checked={draft.requiresSignature}
                    disabled={readOnly}
                    label="نیازمند امضای طرفین"
                    onChange={(checked) => set('requiresSignature', checked)}
                  />
                  <Switch
                    checked={draft.active}
                    disabled={readOnly}
                    label="فعال برای استفاده در فهرست"
                    onChange={(checked) => set('active', checked)}
                  />
                </div>
              </FormGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="فیلدهای فرم"
              subtitle="نامک انگلیسی همان چیزی است که در متن قالب داخل {{ }} قرار می‌گیرد."
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
              {draft.fields.map((field, index) => {
                const used = tokens.some((token) => token.key === field.key && token.used);
                return (
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
                        {!used && field.key ? (
                          <Badge tone="warn" size="sm">
                            در متن استفاده نشده
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

                    <FormGrid columns={3}>
                      <TextInput
                        label="برچسب فارسی"
                        value={field.label}
                        disabled={readOnly}
                        onChange={(event) => updateField(field.id, { label: event.target.value })}
                      />
                      <TextInput
                        label="نامک انگلیسی"
                        value={field.key}
                        dir="ltr"
                        disabled={readOnly}
                        placeholder="seller_name"
                        onChange={(event) => updateField(field.id, { key: event.target.value.replace(/\s/g, '_') })}
                      />
                      <Select
                        label="نوع فیلد"
                        value={field.type}
                        disabled={readOnly}
                        options={FIELD_TYPE_OPTIONS}
                        onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}
                      />
                      <Select
                        label="پیش‌پرکردن از پرونده"
                        value={field.source ?? ''}
                        disabled={readOnly}
                        placeholder="بدون پیش‌پرکردن"
                        options={CLIENT_SOURCES.map((source) => ({
                          value: source.key,
                          label: `${source.group} — ${source.label}`,
                        }))}
                        onChange={(event) => updateField(field.id, { source: event.target.value || undefined })}
                      />
                      <TextInput
                        label="گروه (برای دسته‌بندی فرم)"
                        value={field.group ?? ''}
                        disabled={readOnly}
                        placeholder="فروشنده / خریدار / ملک"
                        onChange={(event) => updateField(field.id, { group: event.target.value || undefined })}
                      />
                      <TextInput
                        label="واحد یا پسوند"
                        value={field.suffix ?? ''}
                        disabled={readOnly}
                        placeholder="متر / تومان"
                        onChange={(event) => updateField(field.id, { suffix: event.target.value || undefined })}
                      />
                      {field.type === 'select' ? (
                        <TextInput
                          label="گزینه‌ها"
                          containerClassName="md:col-span-2"
                          value={(field.options ?? []).join('، ')}
                          disabled={readOnly}
                          hint="با ویرگول جدا کنید"
                          onChange={(event) =>
                            updateField(field.id, {
                              options: event.target.value
                                .split(/[،,]/)
                                .map((option) => option.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      ) : (
                        <TextInput
                          label="متن راهنما داخل کادر"
                          containerClassName="md:col-span-2"
                          value={field.placeholder ?? ''}
                          disabled={readOnly}
                          onChange={(event) => updateField(field.id, { placeholder: event.target.value || undefined })}
                        />
                      )}
                      <TextInput
                        label="راهنمای زیر فیلد"
                        value={field.help ?? ''}
                        disabled={readOnly}
                        onChange={(event) => updateField(field.id, { help: event.target.value || undefined })}
                      />
                      <div className="flex items-end gap-4">
                        <Checkbox
                          label="الزامی"
                          checked={field.required}
                          disabled={readOnly}
                          onChange={(event) => updateField(field.id, { required: event.target.checked })}
                        />
                        {field.type === 'number' && (
                          <NumberInput
                            label="مقدار پیش‌فرض"
                            value={field.defaultValue ?? ''}
                            onChange={(value) => updateField(field.id, { defaultValue: value })}
                          />
                        )}
                      </div>
                    </FormGrid>
                  </div>
                );
              })}

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
            <CardHeader title="متن فرم" subtitle="نشانه‌ها هنگام ساخت سند با مقدار فیلدها جایگزین می‌شوند." icon="file-text" />
            <CardBody>
              <Textarea
                ref={bodyRef}
                label=""
                className="min-h-[420px] text-[12.5px] leading-7"
                value={draft.body}
                disabled={readOnly}
                onChange={(event) => set('body', event.target.value)}
                placeholder={'ماده ۱ — طرفین قرارداد\nفروشنده: {{seller_name}} ...'}
              />
              <p className="mt-2 text-[11px] text-fg-subtle">
                برای درج نشانه، روی دکمه‌های کنار کلیک کنید؛ در محل نشانگر درج می‌شود.
              </p>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="نشانه‌های فیلدها" subtitle="برای درج کلیک کنید" icon="link" />
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
                        title={`درج {{${field.key}}}`}
                      >
                        <Icon name="plus" size={11} />
                        {field.label || field.key}
                        <span className="num text-[10px] opacity-70" dir="ltr">
                          {`{{${field.key}}}`}
                        </span>
                      </button>
                    ))
                ) : (
                  <p className="text-[11.5px] text-fg-subtle">ابتدا در تب «فیلدها» فیلد تعریف کنید.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="نشانه‌های سیستمی" icon="sparkles" />
              <CardBody className="flex flex-wrap gap-1.5">
                {Object.entries(SYSTEM_TOKENS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={readOnly}
                    onClick={() => insertToken(key)}
                    className="chip transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-300"
                  >
                    {label}
                    <span className="num text-[10px] opacity-70" dir="ltr">
                      {`{{${key}}}`}
                    </span>
                  </button>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="بررسی سلامت قالب" icon="alert" />
              <CardBody className="flex flex-col gap-2 text-[11.5px]">
                {unknownTokens.length ? (
                  unknownTokens.map((token) => (
                    <p key={token.key} className="flex items-start gap-1.5 text-warn-fg">
                      <Icon name="alert" size={13} />
                      نشانه <span dir="ltr">{`{{${token.key}}}`}</span> فیلد متناظر ندارد؛ خالی چاپ می‌شود.
                    </p>
                  ))
                ) : (
                  <p className="flex items-center gap-1.5 text-success-fg">
                    <Icon name="check" size={13} />
                    همه نشانه‌های متن، فیلد متناظر دارند.
                  </p>
                )}
                {unusedFields.length ? (
                  unusedFields.map((token) => (
                    <p key={token.key} className="flex items-start gap-1.5 text-fg-muted">
                      <Icon name="info" size={13} />
                      فیلد «{token.label}» در متن استفاده نشده است.
                    </p>
                  ))
                ) : null}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'preview' ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
            <Icon name="info" size={13} />
            پیش‌نمایش با مقادیر نمونه ({displayDigits(draft.fields.length)} فیلد) — دسته: {TEMPLATE_CATEGORY_LABELS[draft.category]}
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
            {displayDigits(draft.fields.filter((field) => field.key).length)} فیلد معتبر •{' '}
            {displayDigits(analyzeTokens({ body: draft.body, fields: draft.fields }).filter((token) => token.used).length)} نشانه در متن
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
