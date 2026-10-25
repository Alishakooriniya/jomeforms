/* تنظیمات: اطلاعات سازمان، پوسته و مدیریت داده‌ها */

import { useMemo, useRef, useState } from 'react';
import type { AppSettings } from '../types';
import { useAuth } from '../store/AuthProvider';
import { useDb, useDbActions } from '../store/DataProvider';
import { useTheme } from '../store/ThemeProvider';
import { useToast } from '../store/ToastProvider';
import { DEMO_ACCOUNTS } from '../data/seed';
import { formatBytes, formatDate, nowISO } from '../lib/format';
import { jalaliDateFromDate } from '../lib/jalali';
import { storageFootprint } from '../lib/storage';
import { estimateBlobUsage } from '../lib/idb';
import { downloadFile } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, InfoList, SectionTitle } from '../components/ui/Card';
import { FormGrid, NumberInput, Switch } from '../components/ui/Controls';
import { TextInput, Textarea } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { THEME_MODES } from '../config/theme';
import { useMediaQuery } from '../lib/hooks';

export default function SettingsPage() {
  const { settings, clients, documents, templates, users, scans, roles, audit } = useDb();
  const { updateSettings, exportBackup, importBackup, resetDemoData, clearAllData } = useDbActions();
  const { can, user } = useAuth();
  const theme = useTheme();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState('org');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const isNarrow = useMediaQuery('(max-width: 640px)');

  const editable = can('settings.edit');
  const footprint = useMemo(() => storageFootprint(), [settings, clients, documents, scans]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const saveOrg = () => {
    if (!editable) return;
    updateSettings(draft);
    toast.success('تنظیمات ذخیره شد');
  };

  const handleBackup = () => {
    downloadFile(
      `crm-backup-${jalaliDateFromDate(new Date()).replaceAll('/', '-')}.json`,
      exportBackup(),
      'application/json',
    );
    toast.success('فایل پشتیبان دانلود شد');
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = importBackup(text);
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
                  label="نام سازمان"
                  value={draft.orgName}
                  disabled={!editable}
                  onChange={(event) => set('orgName', event.target.value)}
                />
                <TextInput
                  label="نام حقوقی"
                  value={draft.orgLegalName}
                  disabled={!editable}
                  onChange={(event) => set('orgLegalName', event.target.value)}
                />
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
                  <Button variant="primary" icon="save" onClick={saveOrg}>
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
                      <p className="text-[13px] font-bold text-[#1f674c]">{draft.orgName || 'نام سازمان'}</p>
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

            <Card>
              <CardHeader title="حساب‌های نمایشی" subtitle="برای بررسی نقش‌ها و دسترسی‌ها" icon="key" />
              <CardBody className="flex flex-col gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <div
                    key={account.username}
                    className="flex items-center justify-between gap-2 rounded-field border border-line bg-card-2/50 px-3 py-2"
                  >
                    <span className="text-[11.5px] text-fg-muted">{account.label}</span>
                    <span className="num text-[11px] text-fg" dir="ltr">
                      {account.username} / {account.password}
                    </span>
                  </div>
                ))}
                <p className="text-[10.5px] text-fg-subtle">
                  رمزها فقط برای دموی سمت کلاینت هستند؛ در نسخه سرور با bcrypt ذخیره می‌شوند.
                </p>
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
                  updateSettings({ showPersianDigits: checked });
                  toast.success(checked ? 'ارقام فارسی فعال شد' : 'ارقام لاتین فعال شد');
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
              <CardHeader title="وضعیت داده‌ها" subtitle="همه داده‌ها در همین مرورگر ذخیره می‌شوند" icon="database" />
              <CardBody className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'پرونده', value: clients.length, icon: 'users' as const },
                    { label: 'سند', value: documents.length, icon: 'file-text' as const },
                    { label: 'فرم', value: templates.length, icon: 'template' as const },
                    { label: 'کاربر', value: users.length, icon: 'user-cog' as const },
                    { label: 'نقش', value: roles.length, icon: 'shield' as const },
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

                <InfoList
                  items={[
                    { label: 'حجم داده‌های متنی (localStorage)', value: formatBytes(footprint) },
                    {
                      label: 'حجم فایل‌های اسکن',
                      value: storage ? `${formatBytes(storage.usage)} از ${formatBytes(storage.quota)}` : 'در دسترس نیست',
                    },
                  ]}
                  columns={1}
                />

                <Button
                  variant="secondary"
                  icon="refresh"
                  onClick={async () => {
                    setStorage(await estimateBlobUsage());
                  }}
                >
                  به‌روزرسانی وضعیت حافظه
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="پشتیبان‌گیری" subtitle="خروجی JSON از کل داده‌ها" icon="download" />
              <CardBody className="flex flex-col gap-4">
                <p className="text-[12px] leading-6 text-fg-muted">
                  فایل پشتیبان شامل کاربران، پرونده‌ها، فرم‌ها، اسناد، نقش‌ها و گزارش فعالیت است. فایل‌های اسکن‌شده داخل
                  فایل پشتیبان قرار نمی‌گیرند (در IndexedDB مرورگر ذخیره می‌شوند).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" icon="download" onClick={handleBackup}>
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
                    onClick={() => fileRef.current?.click()}
                  >
                    بازیابی از فایل
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="border-danger/40">
            <CardHeader title="منطقه خطر" subtitle="عملیات زیر قابل بازگشت نیست" icon="alert" />
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-line p-3">
                <div>
                  <p className="text-[12.5px] font-medium text-fg">بازنشانی به داده نمونه</p>
                  <p className="text-[11px] text-fg-subtle">
                    همه تغییرات پاک و داده‌های نمایشی اولیه (کاربران، پرونده‌ها، فرم‌ها) بازسازی می‌شود.
                  </p>
                </div>
                <Button variant="danger" icon="refresh" disabled={!can('settings.edit')} onClick={() => setConfirmReset(true)}>
                  بازنشانی دمو
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-line p-3">
                <div>
                  <p className="text-[12.5px] font-medium text-fg">پاک‌کردن کامل داده‌ها</p>
                  <p className="text-[11px] text-fg-subtle">
                    برای شروع کار واقعی: همه پرونده‌ها، اسناد و فرم‌ها حذف می‌شوند و سامانه خالی می‌ماند.
                  </p>
                </div>
                <Button variant="danger" icon="trash" disabled={!can('settings.edit')} onClick={() => setConfirmClear(true)}>
                  پاک‌کردن همه داده‌ها
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="درباره این نسخه" icon="info" />
            <CardBody>
              <InfoList
                items={[
                  { label: 'نسخه', value: '۰.۱.۰ (دموی سمت کلاینت)' },
                  { label: 'فناوری', value: 'React + TypeScript + Tailwind CSS (بدون کتابخانه رابط کاربری)' },
                  { label: 'ذخیره‌سازی', value: 'localStorage برای داده‌ها + IndexedDB برای فایل‌های اسکن' },
                  { label: 'پایگاه‌داده پیشنهادی', value: 'PostgreSQL — ساختار در docs/database-schema.sql' },
                  { label: 'وضعیت بک‌اند', value: 'آماده اتصال؛ همه عملیات از src/lib/api.ts عبور می‌کند' },
                ]}
                columns={1}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemoData();
          setConfirmReset(false);
          setDraft(settings);
          toast.success('داده‌های نمونه بازسازی شد');
        }}
        title="بازنشانی به داده نمونه"
        description="همه پرونده‌ها، اسناد و تغییرات شما پاک می‌شود و داده‌های نمایشی اولیه برمی‌گردد."
        confirmLabel="بازنشانی کن"
        variant="danger"
        icon="refresh"
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAllData();
          setConfirmClear(false);
          toast.success('همه داده‌ها پاک شد');
        }}
        title="پاک‌کردن همه داده‌ها"
        description="این عملیات همه پرونده‌ها، اسناد، فرم‌ها، کاربران و گزارش‌ها را حذف می‌کند. پیش از ادامه فایل پشتیبان بگیرید."
        confirmLabel="همه را پاک کن"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
