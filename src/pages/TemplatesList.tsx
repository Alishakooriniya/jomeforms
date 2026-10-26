/* فهرست فرم‌ها — مدیریت فرم‌هایی که مدیر می‌سازد و کاربران در اسناد استفاده می‌کنند */

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
import {
  ActiveFilterChip,
  FilterField,
  FilterSelect,
  ListToolbar,
  ResultsSummary,
  SearchInput,
} from '../components/ui/Toolbar';

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
        title="فرم‌ها"
        subtitle="کتابخانه فرم‌های چاپی؛ برای ساخت سند، یک فرم انتخاب می‌شود"
        actions={
          <>
            {can('templates.create') ? (
              <Button variant="primary" icon="plus" to="/templates/new">
                افزودن فرم
              </Button>
            ) : null}
          </>
        }
      />

      <ListToolbar
        advancedCount={query.filters.state && query.filters.state !== 'all' ? 1 : 0}
        summary={<ResultsSummary total={query.total} unit="فرم" />}
        advanced={
          <>
            <FilterField label="وضعیت فرم">
              <FilterSelect
                value={query.filters.state ?? 'all'}
                onChange={(value) => query.setFilter('state', value)}
                options={[
                  { value: 'active', label: 'فعال' },
                  { value: 'inactive', label: 'غیرفعال' },
                ]}
                placeholder="همه"
              />
            </FilterField>
            {query.hasActiveFilters ? (
              <Button variant="ghost" size="sm" icon="refresh" onClick={query.clearAll}>
                پاک‌کردن فیلترها
              </Button>
            ) : null}
          </>
        }
        activeFilters={
          query.hasActiveFilters ? (
            <>
              {query.q ? <ActiveFilterChip label={`جستجو: ${query.q}`} onRemove={() => query.setQ('')} /> : null}
              {query.filters.category && query.filters.category !== 'all' ? (
                <ActiveFilterChip
                  label={`دسته: ${TEMPLATE_CATEGORY_LABELS[query.filters.category as FormTemplate['category']]}`}
                  onRemove={() => query.setFilter('category', 'all')}
                />
              ) : null}
              {query.filters.state && query.filters.state !== 'all' ? (
                <ActiveFilterChip
                  label={query.filters.state === 'active' ? 'فعال' : 'غیرفعال'}
                  onRemove={() => query.setFilter('state', 'all')}
                />
              ) : null}
            </>
          ) : null
        }
      >
        <SearchInput value={query.q} onChange={query.setQ} placeholder="نام یا توضیح فرم…" />
        <FilterSelect
          value={query.filters.category ?? 'all'}
          onChange={(value) => query.setFilter('category', value)}
          options={TEMPLATE_CATEGORY_OPTIONS}
          placeholder="همه دسته‌ها"
          icon="filter"
          className="w-40"
        />
      </ListToolbar>

      {query.rows.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.rows.map((template) => (
            <article
              key={template.id}
              className="card flex h-full flex-col gap-2 p-3.5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge tone="brand" size="sm">
                    {TEMPLATE_CATEGORY_LABELS[template.category]}
                  </Badge>
                  {!template.active ? (
                    <Badge tone="neutral" size="sm">
                      غیرفعال
                    </Badge>
                  ) : null}
                </div>
                <span className="num text-[10px] text-fg-subtle">ویرایش {formatDate(template.updatedAt)}</span>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/templates/${template.id}`)}
                className="truncate text-start text-[13px] font-semibold text-fg hover:text-brand-700 dark:hover:text-brand-300"
                title={template.title}
              >
                {template.title}
              </button>
              <p className="line-clamp-2 min-h-9 text-[11px] leading-5 text-fg-subtle">
                {template.description || 'بدون توضیح'}
              </p>

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

              <div className="flex items-center justify-end gap-2">
                <Dropdown
                  label="عملیات فرم"
                  items={[
                    ...(can('templates.edit')
                      ? [
                          {
                            id: 'edit',
                            label: 'ویرایش فرم',
                            icon: 'edit' as const,
                            onSelect: () => navigate(`/templates/${template.id}`),
                          },
                        ]
                      : []),
                    ...(can('documents.create')
                      ? [
                          {
                            id: 'use',
                            label: 'ساخت سند از این فرم',
                            icon: 'file-text' as const,
                            onSelect: () => navigate(`/documents/new?template=${template.id}`),
                          },
                        ]
                      : []),
                    ...(can('templates.create')
                      ? [
                          {
                            id: 'duplicate',
                            label: 'کپی فرم',
                            icon: 'copy' as const,
                            onSelect: () => {
                              void duplicateTemplate(template.id)
                                .then((created) => {
                                  if (created) toast.success('نسخه کپی ساخته شد', created.title);
                                })
                                .catch((error: unknown) =>
                                  toast.error(error instanceof Error ? error.message : 'کپی فرم انجام نشد.'),
                                );
                            },
                          },
                        ]
                      : []),
                    ...(can('templates.delete')
                      ? [
                          { id: 'sep', label: '', separator: true, onSelect: () => {} },
                          {
                            id: 'delete',
                            label: 'حذف فرم',
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
            title={query.hasActiveFilters ? 'فرمی با این فیلترها پیدا نشد' : 'هنوز فرمی اضافه نشده است'}
            description={
              query.hasActiveFilters
                ? 'عبارت جستجو را تغییر دهید.'
                : 'با سه قدم شروع کنید: نام فرم را وارد کنید، پرسش‌ها را اضافه کنید و متن چاپی را بنویسید.'
            }
            action={
              can('templates.create') ? (
                <Button variant="primary" icon="plus" to="/templates/new">
                  افزودن فرم
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
            void deleteTemplate(pendingDelete.id)
              .then(() => toast.success('فرم حذف شد', pendingDelete.title))
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'حذف فرم انجام نشد.'),
              );
          }
          setPendingDelete(null);
        }}
        title="حذف فرم"
        description={
          <>
            فرم <b className="text-fg">{pendingDelete?.title}</b> حذف می‌شود. اسناد ساخته‌شده از این فرم باقی می‌مانند.
          </>
        }
        confirmLabel="حذف کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}