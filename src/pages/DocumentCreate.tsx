/* ساخت سند از قالب در سه گام:
   ۱) انتخاب قالب  ۲) انتخاب پرونده  ۳) تکمیل اطلاعات و چاپ */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Client, DocStatus, FormTemplate } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { CLIENT_STATUS_LABELS, DOC_STATUS_LABELS, TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_OPTIONS } from '../data/labels';
import { displayDigits, formatCode } from '../lib/format';
import { autofillValues } from '../lib/template';
import { cn, normalizeText } from '../lib/utils';
import { printDocument } from '../lib/documentActions';
import { normalizeJalaliDate } from '../lib/jalali';
import { Avatar, PageHeader } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { SearchInput } from '../components/ui/Toolbar';
import { Tabs } from '../components/ui/Tabs';
import { DynamicFields } from '../components/form/DynamicFields';
import { DocumentPreview } from '../components/documents/DocumentPreview';

const STEPS = [
  { id: 'template', label: 'انتخاب قالب فرم', icon: 'template' as const },
  { id: 'client', label: 'اتصال به پرونده', icon: 'users' as const },
  { id: 'fill', label: 'تکمیل و ذخیره', icon: 'check' as const },
];

export default function DocumentCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { templates, clients, settings } = useDb();
  const { createDocument } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();

  // امکان ورود مستقیم: /documents/new?template=...&client=...
  const [templateId, setTemplateId] = useState(() => searchParams.get('template') ?? '');
  const [clientId, setClientId] = useState(searchParams.get('client') ?? '');
  const [step, setStep] = useState(() => (searchParams.get('template') ? 1 : 0));
  const [values, setValues] = useState<Record<string, string>>(() => {
    const preset = templates.find((item) => item.id === searchParams.get('template'));
    const presetClient = clients.find((item) => item.id === searchParams.get('client'));
    return preset ? autofillValues(preset, presetClient) : {};
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState('fields');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [templateQuery, setTemplateQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [initialStatus, setInitialStatus] = useState<DocStatus>('draft');

  const template = templates.find((item) => item.id === templateId);
  const client = clients.find((item) => item.id === clientId);

  const visibleTemplates = useMemo(
    () =>
      templates
        .filter((item) => item.active)
        .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
        .filter((item) =>
          templateQuery ? normalizeText(`${item.title} ${item.description ?? ''}`).includes(normalizeText(templateQuery)) : true,
        ),
    [templates, categoryFilter, templateQuery],
  );

  const visibleClients = useMemo(
    () =>
      clients
        .filter((item) =>
          clientQuery
            ? normalizeText(`${item.fullName} ${item.code} ${item.mobile} ${item.nationalId}`).includes(normalizeText(clientQuery))
            : true,
        )
        .slice(0, 40),
    [clients, clientQuery],
  );

  const pickTemplate = (next: FormTemplate) => {
    setTemplateId(next.id);
    setValues((prev) => {
      const manual: Record<string, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!next.fields.some((field) => field.key === key && field.source)) manual[key] = value;
      });
      return { ...autofillValues(next, client), ...manual };
    });
    setErrors({});
    setStep(1);
  };

  const pickClient = (next?: Client) => {
    setClientId(next?.id ?? '');
    if (template) {
      setValues((prev) => {
        const manual: Record<string, string> = {};
        template.fields.forEach((field) => {
          if (!field.source && prev[field.key]) manual[field.key] = prev[field.key];
        });
        return { ...autofillValues(template, next), ...manual };
      });
    }
    setStep(2);
  };

  const save = (printAfter: boolean) => {
    if (!template) return;
    const missing: Record<string, string> = {};
    const normalizedValues = { ...values };
    template.fields.forEach((field) => {
      if (field.required && !values[field.key]?.trim()) missing[field.key] = 'این فیلد الزامی است.';
      if (field.type === 'date' && values[field.key]?.trim()) {
        const normalized = normalizeJalaliDate(values[field.key]);
        if (!normalized) missing[field.key] = 'تاریخ باید شمسی و به‌شکل ۱۴۰۵/۰۷/۳۰ باشد.';
        else normalizedValues[field.key] = normalized;
      }
    });
    setErrors(missing);
    if (Object.keys(missing).length) {
      setTab('fields');
      setStep(2);
      toast.error('فیلدهای الزامی تکمیل نشده‌اند', 'موارد مشخص‌شده را پر کنید.');
      return;
    }

    const document = createDocument({
      templateId: template.id,
      clientId: client?.id,
      values: normalizedValues,
      status: initialStatus,
    });

    if (printAfter) {
      const opened = printDocument(document, template, settings);
      if (!opened) toast.warn('پنجره چاپ باز نشد', 'اجازه بازشدن پنجره جدید را در مرورگر فعال کنید.');
    }
    toast.success('سند ساخته شد', `${formatCode(document.number)} — ${document.title}`);
    navigate(`/documents/${document.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="ساخت سند از قالب"
        subtitle="قالب را انتخاب کنید، پرونده را وصل کنید و اطلاعات خودکار جای‌گذاری می‌شود."
        icon="file-text"
        breadcrumbs={[
          { label: 'داشبورد', to: '/' },
          { label: 'اسناد', to: '/documents' },
          { label: 'سند جدید' },
        ]}
        actions={
          <Button variant="ghost" icon="close" onClick={() => navigate('/documents')}>
            انصراف
          </Button>
        }
      />

      {/* گام‌ها */}
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((item, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={index > step}
                onClick={() => setStep(index)}
                className={cn(
                  'flex items-center gap-2 rounded-btn border px-3 py-2 text-[12.5px] transition-colors disabled:opacity-60',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-200'
                    : done
                      ? 'border-line bg-card text-fg-muted'
                      : 'border-line bg-card text-fg-subtle',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px]',
                    active || done ? 'bg-brand-600 text-white' : 'bg-card-2 text-fg-subtle',
                  )}
                >
                  {done ? <Icon name="check" size={12} bold /> : displayDigits(index + 1)}
                </span>
                {item.label}
              </button>
              {index < STEPS.length - 1 ? <Icon name="chevron-left" size={14} className="text-fg-subtle" /> : null}
            </li>
          );
        })}
      </ol>

      {/* گام ۱ — قالب */}
      {step === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={templateQuery}
              onChange={setTemplateQuery}
              placeholder="جستجوی قالب…"
              className="w-full sm:w-64"
            />
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[{ value: 'all', label: 'همه دسته‌ها' }, ...TEMPLATE_CATEGORY_OPTIONS]}
              containerClassName="w-44"
              aria-label="دسته قالب"
            />
            <span className="num ms-auto text-[11.5px] text-fg-subtle">
              {displayDigits(visibleTemplates.length)} قالب
            </span>
          </div>

          {visibleTemplates.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickTemplate(item)}
                  className={cn(
                    'card flex h-full flex-col gap-2 p-4 text-start transition-colors hover:border-brand-400 hover:bg-card-2',
                    templateId === item.id && 'border-brand-500',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-field bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300">
                      <Icon name="template" size={17} />
                    </span>
                    <Badge tone="neutral" size="sm">
                      {TEMPLATE_CATEGORY_LABELS[item.category]}
                    </Badge>
                  </div>
                  <p className="text-[13px] font-semibold text-fg">{item.title}</p>
                  <p className="line-clamp-2 text-[11.5px] leading-5 text-fg-subtle">{item.description}</p>
                  <div className="mt-auto flex items-center gap-3 pt-2 text-[10.5px] text-fg-subtle">
                    <span className="flex items-center gap-1">
                      <Icon name="list" size={12} />
                      {displayDigits(item.fields.length)} فیلد
                    </span>
                    {item.requiresSignature ? (
                      <span className="flex items-center gap-1">
                        <Icon name="edit" size={12} />
                        نیازمند امضا
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon="template"
                title="قالبی یافت نشد"
                description="عبارت جستجو را تغییر دهید یا از سوپرادمین بخواهید قالب فرم جدیدی اضافه کند."
                action={
                  can('templates.create') ? (
                    <Button variant="soft" icon="plus" to="/templates/new">
                      افزودن قالب
                    </Button>
                  ) : null
                }
              />
            </Card>
          )}
        </div>
      ) : null}

      {/* گام ۲ — پرونده */}
      {step === 1 ? (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex items-center gap-2 text-[12px] text-fg-muted">
              <Icon name="template" size={15} />
              قالب انتخابی: <b className="text-fg">{template?.title}</b>
            </div>
            <Button size="sm" variant="ghost" icon="edit" onClick={() => setStep(0)} className="ms-auto">
              تغییر قالب
            </Button>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={clientQuery}
              onChange={setClientQuery}
              placeholder="جستجوی پرونده: نام، شماره، موبایل…"
              className="w-full sm:w-72"
            />
            {can('clients.create') ? (
              <Button variant="ghost" size="sm" icon="plus" onClick={() => navigate('/clients/new')}>
                ثبت پرونده جدید
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => pickClient(undefined)}
              className="card flex items-center gap-3 p-3 text-start transition-colors hover:border-line-strong hover:bg-card-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-field bg-card-2 text-fg-muted">
                <Icon name="edit" size={16} />
              </span>
              <span>
                <span className="block text-[12.5px] font-medium text-fg">بدون پرونده</span>
                <span className="block text-[10.5px] text-fg-subtle">تکمیل دستی همه فیلدها</span>
              </span>
            </button>

            {visibleClients.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => pickClient(item)}
                className={cn(
                  'card flex items-center gap-3 p-3 text-start transition-colors hover:border-brand-400 hover:bg-card-2',
                  clientId === item.id && 'border-brand-500',
                )}
              >
                <Avatar name={item.fullName} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-fg">{item.fullName}</span>
                  <span className="num block truncate text-[10.5px] text-fg-subtle">
                    {formatCode(item.code)} • {CLIENT_STATUS_LABELS[item.status]}
                  </span>
                </span>
                <Icon name="chevron-left" size={15} className="text-fg-subtle" />
              </button>
            ))}
          </div>

          {!visibleClients.length ? (
            <Card>
              <EmptyState compact icon="users" title="پرونده‌ای یافت نشد" description="عبارت جستجو را تغییر دهید." />
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* گام ۳ — تکمیل */}
      {step === 2 ? (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-[12px] text-fg-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="template" size={14} /> {template?.title}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="users" size={14} />{' '}
              {client ? `${client.fullName} (${formatCode(client.code)})` : 'بدون پرونده'}
            </span>
            <div className="ms-auto flex items-center gap-2">
              <Select
                value={initialStatus}
                onChange={(event) => setInitialStatus(event.target.value as DocStatus)}
                options={(Object.keys(DOC_STATUS_LABELS) as DocStatus[]).map((status) => ({
                  value: status,
                  label: `وضعیت اولیه: ${DOC_STATUS_LABELS[status]}`,
                }))}
                containerClassName="w-52"
                aria-label="وضعیت اولیه سند"
              />
              <Button size="sm" variant="ghost" icon="edit" onClick={() => setStep(1)}>
                تغییر پرونده
              </Button>
            </div>
          </Card>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'fields', label: 'تکمیل اطلاعات', icon: 'clipboard' },
              { id: 'preview', label: 'پیش‌نمایش سند', icon: 'eye' },
            ]}
          />

          {tab === 'fields' && template ? (
            <Card className="p-4">
              <DynamicFields
                fields={template.fields}
                values={values}
                errors={errors}
                client={client}
                onChange={(key, value) => {
                  setValues((prev) => ({ ...prev, [key]: value }));
                  if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
                }}
              />
            </Card>
          ) : null}

          {tab === 'preview' && template ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
                <Icon name="info" size={13} />
                این پیش‌نمایش همان چیزی است که چاپ می‌شود؛ جاهای خالی با نقطه‌چین نمایش داده می‌شوند.
              </p>
              <DocumentPreview template={template} values={values} settings={settings} />
            </div>
          ) : null}

          <Card className="flex flex-wrap items-center justify-end gap-2 p-3">
            <Button variant="ghost" icon="chevron-right" onClick={() => setStep(1)}>
              بازگشت
            </Button>
            <Button
              variant="secondary"
              icon="eye"
              onClick={() => {
                setTab('preview');
              }}
            >
              پیش‌نمایش
            </Button>
            <Button variant="soft" icon="save" onClick={() => save(false)}>
              ذخیره سند
            </Button>
            {can('documents.print') ? (
              <Button variant="primary" icon="print" onClick={() => save(true)}>
                ذخیره و چاپ
              </Button>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
