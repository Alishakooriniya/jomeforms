/* تنظیمات: اطلاعات سازمان، پوسته و مدیریت داده‌ها */

import { useRef, useState } from 'react';
import type { AppSettings } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useTheme } from '../store/ThemeProvider';
import { useToast } from '../store/ToastProvider';
import { formatDate, nowISO } from '../lib/format';
import { jalaliDateFromDate } from '../lib/jalali';
import { downloadFile } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList, SectionTitle } from '../components/ui/Card';
import { FormGrid, NumberInput, Switch } from '../components/ui/Controls';
import { TextInput, Textarea } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { THEME_MODES } from '../config/theme';
import { ORG_NAME } from '../config/org';
import { useMediaQuery } from '../lib/hooks';

export default function SettingsPage() {
  const { settings, clients, documents, templates, users, scans, audit } = useDb();
  const { updateSettings, exportBackup, importBackup } = useDbActions();
  const { can, user } = useAuth();
  const theme = useTheme();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState('org');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const isNarrow = useMediaQuery('(max-width: 640px)');

  const editable = can('settings.edit');

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const saveOrg = async () => {
    if (!editable) return;
    setSaving(true);
    try {
      await updateSettings(draft);
      toast.success('تنظیمات ذخیره شد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ذخیره تنظیمات انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const json = await exportBackup();
      downloadFile(
        `crm-backup-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.json`,
        json,
        'application/json',
      );
      toast.success('فایل پشتیبان دانلود شد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'گرفتن پشتیبان انجام نشد.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    const text = await file.text();
    const result = await importBackup(text);
    setImporting(false);
    if (result.ok) toast.success('داده‌ها بازیابی شد');
    else toast.error('بازیابی انجام نشد', result.error);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="تنظیمات"
        subtitle="اطلاعات سازمان، پوسته سامانه و مدیریت داده‌ها"
        icon="settings"
        breadcrumbs={[{ label: 'داشبورد', to: '/' }, { label: 'تنظیمات' }]}
      />

      {!editable ? (
        <p className="flex items-center gap-2 rounded-card border border-line bg-warn-soft px-3 py-2 text-[12px] text-warn-fg">
          <Icon name="lock" size={14} />
          دسترسی «تغییر تنظیمات» برای شما فعال نیست؛ فقط مشاهده امکان‌پذیر است.
        </p>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'org', label: 'اطلاعات سازمان', icon: 'building' },
          { id: 'appearance', label: 'پوسته و نمایش', icon: 'sun' },
          { id: 'data', label: 'داده‌ها و پشتیبان', icon: 'database' },
        ]}
      />

      {tab === 'org' ? (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader title="اطلاعات سازمان" subtitle="این اطلاعات در سرصفحه اسناد چاپی استفاده می‌شود" icon="building" />
            <CardBody className="flex flex-col gap-4">
              <FormGrid columns={2}>
                <TextInput
                  label="تلفن"
                  dir="ltr"
                  value={draft.orgPhone}
                  disabled={!editable}
                  onChange={(event) => set('orgPhone', event.target.value)}
                />
                <TextInput
                  label="پیش‌شماره شماره سند"
                  dir="ltr"
                  value={draft.docPrefix}
                  disabled={!editable}
                  onChange={(event) => set('docPrefix', event.target.value)}
                  hint="مثال: س-  →  س-۱۴۰۵-۰۰۰۱"
                />
                <TextInput
                  label="پیش‌شماره شماره پرونده"
                  dir="ltr"
                  value={draft.clientPrefix}
                  disabled={!editable}
                  onChange={(event) => set('clientPrefix', event.target.value)}
                  hint="مثال: پ-  →  پ-۱۴۰۵-۰۰۰۱"
                />
                <NumberInput
                  label="تعداد سطر پیش‌فرض جدول‌ها"
                  value={String(draft.defaultPageSize)}
                  onChange={(value) => set('defaultPageSize', Number(value || 10))}
                  suffix="سطر"
                />
                <TextInput
                  label="استان پیش‌فرض"
                  value={draft.defaultProvince}
                  disabled={!editable}
                  onChange={(event) => set('defaultProvince', event.target.value)}
                />
                <TextInput
                  label="شهر پیش‌فرض"
                  value={draft.defaultCity}
                  disabled={!editable}
                  onChange={(event) => set('defaultCity', event.target.value)}
                />
                <Textarea
                  label="نشانی سازمان"
                  containerClassName="md:col-span-2"
                  className="min-h-16"
                  value={draft.orgAddress}
                  disabled={!editable}
                  onChange={(event) => set('orgAddress', event.target.value)}
                />
                <Textarea
                  label="یادداشت پیش‌فرض پای اسناد"
                  containerClassName="md:col-span-2"
                  className="min-h-16"
                  value={draft.contractNote}
                  disabled={!editable}
                  onChange={(event) => set('contractNote', event.target.value)}
                />
              </FormGrid>

              {editable ? (
                <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                  <Button variant="ghost" onClick={() => setDraft(settings)}>
                    بازگردانی
                  </Button>
                  <Button variant="primary" icon="save" onClick={() => void saveOrg()} loading={saving}>
                    ذخیره تنظیمات
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="پیش‌نمایش سرصفحه سند" icon="eye" />
              <CardBody>
                <div className="rounded-card border border-line bg-white p-4 text-[#171717]">
                  <div className="flex items-start justify-between gap-3 border-b-2 border-[#24815d] pb-2">
                    <div>
                      <p className="text-[13px] font-bold text-[#1f674c]">{ORG_NAME}</p>
                      <p className="mt-0.5 text-[10px] text-[#565656]">{draft.orgAddress || 'نشانی سازمان'}</p>
                    </div>
                    <div className="text-end text-[10px] text-[#565656]">
                      <p dir="ltr">{draft.orgPhone ? `تلفن: ${draft.orgPhone}` : ''}</p>
                      <p>{formatDate(nowISO(), 'long')}</p>
                    </div>
                  </div>
                  <p className="num mt-2 text-[10px] text-[#565656]">
                    شماره سند نمونه: {draft.docPrefix}1405-0001
                  </p>
                </div>
              </CardBody>
            </Card>

          </div>
        </div>
      ) : null}

      {tab === 'appearance' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="پوسته" subtitle="حالت روشن یا تاریک" icon="sun" />
            <CardBody className="flex flex-col gap-4">
              <div>
                <SectionTitle title="حالت نمایش" />
                <div className="grid grid-cols-2 gap-2">
                  {THEME_MODES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => theme.setMode(option.value)}
                      className={
                        theme.mode === option.value
                          ? 'flex flex-col items-center gap-1.5 rounded-card border border-brand-500 bg-brand-50 p-3 text-[12px] text-brand-700 dark:bg-brand-500/12 dark:text-brand-200'
                          : 'flex flex-col items-center gap-1.5 rounded-card border border-line bg-card p-3 text-[12px] text-fg-muted hover:bg-card-2'
                      }
                    >
                      <Icon name={option.icon} size={18} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="نمایش داده‌ها" icon="list" />
            <CardBody className="flex flex-col gap-4">
              <Switch
                checked={settings.showPersianDigits}
                disabled={!editable}
                label="نمایش ارقام فارسی"
                hint={isNarrow ? 'در صفحه‌های کوچک ممکن است خوانایی کمتر شود' : 'اعداد در جدول‌ها و اسناد با ارقام فارسی نمایش داده می‌شوند'}
                onChange={(checked) => {
                  void updateSettings({ showPersianDigits: checked })
                    .then(() => toast.success(checked ? 'ارقام فارسی فعال شد' : 'ارقام لاتین فعال شد'))
                    .catch((error: unknown) =>
                      toast.error(error instanceof Error ? error.message : 'ذخیره تنظیمات انجام نشد.'),
                    );
                }}
                id="persian-digits"
              />
              <div className="rounded-field border border-line bg-card-2/50 p-3">
                <p className="mb-2 text-[11.5px] text-fg-muted">نمونه نمایش اعداد</p>
                <div className="flex flex-wrap gap-3 text-[12px]">
                  <span className="num text-fg">۱۴۰۵/۰۷/۱۹</span>
                  <span className="num text-fg">۱۲٬۵۰۰٬۰۰۰ تومان</span>
                  <span className="num text-fg">۰۹۱۲۳۴۵۶۷۸۹</span>
                </div>
              </div>
              <InfoList
                items={[
                  { label: 'حالت فعلی', value: theme.isDark ? 'تاریک' : 'روشن' },
                  { label: 'کاربر جاری', value: user?.fullName ?? '—' },
                ]}
                columns={1}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'data' ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="وضعیت داده‌ها" subtitle="همه داده‌ها روی سرور در PostgreSQL نگه‌داری می‌شوند" icon="database" />
              <CardBody className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'پرونده', value: clients.length, icon: 'users' as const },
                    { label: 'سند', value: documents.length, icon: 'file-text' as const },
                    { label: 'فرم', value: templates.length, icon: 'template' as const },
                    { label: 'کاربر', value: users.length, icon: 'user-cog' as const },
                    { label: 'اسکن', value: scans.length, icon: 'scan' as const },
                    { label: 'رویداد', value: audit.length, icon: 'history' as const },
                  ].map((item) => (
                    <div key={item.label} className="rounded-field border border-line bg-card-2/50 p-2.5">
                      <p className="flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
                        <Icon name={item.icon} size={12} />
                        {item.label}
                      </p>
                      <p className="num mt-1 text-base font-semibold text-fg">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="پشتیبان‌گیری" subtitle="خروجی JSON از کل داده‌های سرور" icon="download" />
              <CardBody className="flex flex-col gap-4">
                <p className="text-[12px] leading-6 text-fg-muted">
                  فایل پشتیبان روی سرور ساخته می‌شود و شامل کاربران، مجموعه‌ها، پرونده‌ها، فرم‌ها، اسناد، یادآورها و
                  تنظیمات است. فایل‌های اسکن‌شده داخل فایل پشتیبان قرار نمی‌گیرند.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" icon="download" onClick={() => void handleBackup()} loading={backingUp}>
                    دانلود پشتیبان
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleImport(file);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    variant="secondary"
                    icon="upload"
                    disabled={!editable}
                    loading={importing}
                    onClick={() => fileRef.current?.click()}
                  >
                    بازیابی از فایل
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="درباره این نسخه" icon="info" />
            <CardBody>
              <InfoList
                items={[
                  { label: 'نسخه', value: '۰.۲.۰' },
                  { label: 'فناوری', value: 'React + TypeScript + Tailwind CSS — بک‌اند Express' },
                  { label: 'ذخیره‌سازی', value: 'PostgreSQL روی سرور؛ همه عملیات از API انجام می‌شود' },
                  { label: 'وضعیت بک‌اند', value: 'متصل؛ احراز هویت و همه داده‌ها از src/lib/apiClient.ts عبور می‌کند' },
                ]}
                columns={1}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
