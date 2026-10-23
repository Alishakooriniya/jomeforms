/* فهرست قالب فرم‌ها — مدیریت فرم‌هایی که سوپرادمین اضافه می‌کند */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormTemplate } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useToast } from '../store/ToastProvider';
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_OPTIONS } from '../data/labels';
import { displayDigits, formatDate } from '../lib/format';
import { useListQuery } from '../lib/hooks';
import { analyzeTokens, SYSTEM_TOKENS } from '../lib/template';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/Avatar';
import { FilterBar, FilterSelect, ResultsSummary, SearchInput } from '../components/ui/Toolbar';

export default function TemplatesList() {
  const { templates, documents } = useDb();
  const { duplicateTemplate, deleteTemplate } = useDbActions();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<FormTemplate | null>(null);

  const query = useListQuery<FormTemplate>(templates, {
    search: (template) => `${template.title} ${template.description ?? ''} ${template.body}`,
    filters: {
      category: (template, value) => template.category === value,
      state: (template, value) => (value === 'active' ? template.active : !template.active),
    },
  });

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    documents.forEach((document) => map.set(document.templateId, (map.get(document.templateId) ?? 0) + 1));
    return map;
  }, [documents]);

  const issues = (template: FormTemplate) => {
    const tokens = analyzeTokens(template);
    return tokens.filter((token) => !token.inFields && !(token.key in SYSTEM_TOKENS)).length;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="قالب فرم‌ها"
        subtitle="فرم‌ها را بسازید و ویرایش کنید؛ عنوان فیلدها هنگام نوشتن متن قابل درج هستند."
        icon="template"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'قالب فرم‌ها' }]}
        actions={
          <>
            {can('templates.create') ? (
              <Button variant="primary" icon="plus" to="/templates/new">
                افزودن قالب فرم
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar actions={<ResultsSummary total={query.total} unit="قالب" />}>
        <SearchInput
          value={query.q}
          onChange={query.setQ}
          placeholder="جستجوی نام یا توضیح فرم…"
          className="w-full sm:w-72"
        />
        <FilterSelect
          value={query.filters.category ?? 'all'}
          onChange={(value) => query.setFilter('category', value)}
          options={TEMPLATE_CATEGORY_OPTIONS}
          placeholder="همه دسته‌ها"
          icon="filter"
        />
        <FilterSelect
          value={query.filters.state ?? 'all'}
          onChange={(value) => query.setFilter('state', value)}
          options={[
            { value: 'active', label: 'فعال' },
            { value: 'inactive', label: 'غیرفعال' },
          ]}
          placeholder="همه وضعیت‌ها"
        />
      </FilterBar>

      {query.rows.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.rows.map((template) => (
            <article key={template.id} className="card flex h-full flex-col gap-2.5 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-field bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300">
                  <span className="text-[11px] font-medium">
                    {displayDigits(template.fields.length)}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  {!template.active ? (
                    <Badge tone="neutral" size="sm">
                      غیرفعال
                    </Badge>
                  ) : null}
                  <Badge tone="brand" size="sm">
                    {TEMPLATE_CATEGORY_LABELS[template.category]}
                  </Badge>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/templates/${template.id}`)}
                className="text-start text-[13px] font-semibold text-fg hover:text-brand-700 dark:hover:text-brand-300"
              >
                {template.title}
              </button>
              <p className="line-clamp-2 text-[11.5px] leading-5 text-fg-subtle">{template.description}</p>

              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[10.5px] text-fg-subtle">
                <span className="flex items-center gap-1">
                  <Icon name="list" size={12} />
                  {displayDigits(template.fields.length)} فیلد
                </span>
                <span className="num flex items-center gap-1">
                  <Icon name="file-text" size={12} />
                  {displayDigits(usage.get(template.id) ?? 0)} سند
                </span>
                <span className="num flex items-center gap-1">
                  <Icon name="refresh" size={12} />
                  نسخه {displayDigits(template.version)}
                </span>
                {issues(template) ? (
                  <span className="flex items-center gap-1 text-warn-fg">
                    <Icon name="alert" size={12} />
                    {displayDigits(issues(template))} نشانهٔ نامعتبر در متن
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="num text-[10.5px] text-fg-subtle">
                  آخرین ویرایش {formatDate(template.updatedAt)}
                </span>
                <Dropdown
                  label="عملیات قالب"
                  items={[
                    ...(can('templates.edit')
                      ? [
                          {
                            id: 'edit',
                            label: 'ویرایش قالب',
                            icon: 'edit' as const,
                            onSelect: () => navigate(`/templates/${template.id}`),
                          },
                        ]
                      : []),
                    ...(can('documents.create')
                      ? [
                          {
                            id: 'use',
                            label: 'ساخت سند از این قالب',
                            icon: 'file-text' as const,
                            onSelect: () => navigate(`/documents/new?template=${template.id}`),
                          },
                        ]
                      : []),
                    ...(can('templates.create')
                      ? [
                          {
                            id: 'duplicate',
                            label: 'کپی قالب',
                            icon: 'copy' as const,
                            onSelect: () => {
                              const created = duplicateTemplate(template.id);
                              if (created) toast.success('نسخه کپی ساخته شد', created.title);
                            },
                          },
                        ]
                      : []),
                    ...(can('templates.delete')
                      ? [
                          { id: 'sep', label: '', separator: true, onSelect: () => {} },
                          {
                            id: 'delete',
                            label: 'حذف قالب',
                            icon: 'trash' as const,
                            danger: true,
                            onSelect: () => setPendingDelete(template),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon="template"
            title={query.hasActiveFilters ? 'قالبی با این فیلترها پیدا نشد' : 'هنوز قالبی اضافه نشده است'}
            description={
              query.hasActiveFilters
                ? 'عبارت جستجو را تغییر دهید.'
                : 'با سه قدم شروع کنید: نام فرم را وارد کنید، پرسش‌ها را اضافه کنید و متن چاپی را بنویسید.'
            }
            action={
              can('templates.create') ? (
                <Button variant="primary" icon="plus" to="/templates/new">
                  افزودن قالب فرم
                </Button>
              ) : null
            }
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteTemplate(pendingDelete.id);
            toast.success('قالب حذف شد', pendingDelete.title);
          }
          setPendingDelete(null);
        }}
        title="حذف قالب فرم"
        description={
          <>
            قالب <b className="text-fg">{pendingDelete?.title}</b> حذف می‌شود. اسناد ساخته‌شده از این قالب باقی می‌مانند.
          </>
        }
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}