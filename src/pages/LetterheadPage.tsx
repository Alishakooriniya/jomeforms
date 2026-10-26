/* سربرگ — نوشتن نامه روی سربرگ رسمی سازمان و چاپ آن.
   سه کادر: سربرگ ثابت بالا، فضای نامه در میانه، نشانی قابل‌ویرایش پایین.
   هر چاپ (خالی یا تکمیل‌شده، A4 یا A5) در جدول پیگیری و گزارش فعالیت ثبت می‌شود. */

import { useEffect, useRef, useState } from 'react';
import type { LetterheadPaper } from '../types';
import { DEFAULT_LETTERHEAD_ADDRESS } from '../config/org';
import { api } from '../lib/apiClient';
import { useDbActions } from '../store/DataProvider';
import { useAuth } from '../store/AuthProvider';
import { useToast } from '../store/ToastProvider';
import { todayInputValue } from '../lib/format';
import { openLetterheadPrintWindow } from '../lib/letterheadPrint';
import type { LetterheadValues } from '../lib/letterheadPrint';
import { LetterheadPreview } from '../components/letterhead/LetterheadPreview';
import { PageHeader } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Switch } from '../components/ui/Controls';
import { Textarea, TextInput } from '../components/ui/Field';
import { JalaliDatePicker } from '../components/ui/JalaliDatePicker';

const emptyValues = (): LetterheadValues => ({
  date: todayInputValue(),
  number: '',
  attachment: '',
  body: '',
});

export default function LetterheadPage() {
  const { can } = useAuth();
  const { saveLetterheadAddress, recordLetterheadPrint } = useDbActions();
  const toast = useToast();

  const canManage = can('letterhead.manage');

  const [address, setAddress] = useState(DEFAULT_LETTERHEAD_ADDRESS);
  const [addressDraft, setAddressDraft] = useState(DEFAULT_LETTERHEAD_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);
  const [values, setValues] = useState<LetterheadValues>(emptyValues);
  const [previewBlank, setPreviewBlank] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const set = <K extends keyof LetterheadValues>(key: K, value: LetterheadValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  /** قالب‌بندی متن نامه — روی انتخاب فعلی داخل کانواس کادر میانی اعمال می‌شود */
  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
  };

  /* نشانی سربرگ از سرور خوانده می‌شود */
  useEffect(() => {
    api.letterhead
      .get()
      .then((config) => {
        setAddress(config.address);
        setAddressDraft(config.address);
      })
      .catch(() => undefined);
  }, []);

  const doPrint = async (paper: LetterheadPaper, blank: boolean) => {
    const key = `${paper}-${blank ? 'blank' : 'filled'}`;
    setPrinting(key);

    // اول رخداد چاپ ثبت می‌شود؛ اگر ثبت نشد، چاپ انجام نمی‌شود (پیگیری امنیتی)
    const snapshot = blank ? undefined : Object.fromEntries(
      Object.entries(values).map(([field, value]) => [field, value?.trim() ?? '']),
    );
    const recorded = await recordLetterheadPrint({
      paper,
      kind: blank ? 'blank' : 'filled',
      values: snapshot,
    });
    if (!recorded.ok) {
      setPrinting(null);
      toast.error('چاپ ثبت نشد', recorded.error ?? 'برای پیگیری امنیتی، چاپ بدون ثبت انجام نمی‌شود.');
      return;
    }

    const printWindow = openLetterheadPrintWindow({ address, values, paper, blank });
    setPrinting(null);
    if (!printWindow) {
      toast.error('پنجره چاپ باز نشد', 'اجازه بازشدن پنجره‌ها (popup) را برای این سامانه فعال کنید.');
    } else {
      printWindow.print();
    }
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    const result = await saveLetterheadAddress(addressDraft);
    setSavingAddress(false);
    if (!result.ok) {
      toast.error('نشانی ذخیره نشد', result.error);
      return;
    }
    setAddress(result.config?.address ?? addressDraft);
    toast.success('نشانی سربرگ به‌روزرسانی شد');
  };

  const resetAddress = async () => {
    setSavingAddress(true);
    const result = await saveLetterheadAddress('');
    setSavingAddress(false);
    if (!result.ok) {
      toast.error('بازگشت به پیش‌فرض انجام نشد', result.error);
      return;
    }
    const next = result.config?.address ?? DEFAULT_LETTERHEAD_ADDRESS;
    setAddress(next);
    setAddressDraft(next);
    toast.success('نشانی به متن پیش‌فرض برگشت');
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="سربرگ"
        subtitle="نامه را روی کادر میانی بنویسید و چاپ کنید"
        actions={
          <>
            <Button variant="secondary" icon="print" loading={printing === 'A5-blank'} onClick={() => doPrint('A5', true)}>
              سربرگ خالی A5
            </Button>
            <Button variant="secondary" icon="print" loading={printing === 'A4-blank'} onClick={() => doPrint('A4', true)}>
              سربرگ خالی A4
            </Button>
            <Button variant="secondary" icon="print" loading={printing === 'A5-filled'} onClick={() => doPrint('A5', false)}>
              چاپ A5
            </Button>
            <Button variant="primary" icon="print" loading={printing === 'A4-filled'} onClick={() => doPrint('A4', false)}>
              چاپ A4
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(340px,420px)_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="فیلدهای سربرگ" icon="edit" />
            <CardBody className="flex flex-col gap-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <JalaliDatePicker
                  label="تاریخ"
                  value={values.date ?? ''}
                  onChange={(value) => set('date', value)}
                />
                <TextInput
                  label="شماره"
                  value={values.number ?? ''}
                  onChange={(event) => set('number', event.target.value)}
                />
                <TextInput
                  label="پیوست"
                  value={values.attachment ?? ''}
                  onChange={(event) => set('attachment', event.target.value)}
                />
              </div>
              {canManage ? (
                <>
                  <div className="border-t border-line pt-3">
                    <Textarea
                      label="نشانی کادر پایین"
                      rows={3}
                      value={addressDraft}
                      onChange={(event) => setAddressDraft(event.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon="save"
                      loading={savingAddress}
                      disabled={addressDraft === address}
                      onClick={saveAddress}
                    >
                      ذخیره
                    </Button>
                    <Button variant="ghost" size="sm" icon="refresh" disabled={savingAddress} onClick={resetAddress}>
                      پیش‌فرض
                    </Button>
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader
              title="پیش‌نمایش سربرگ"
              icon="eye"
              action={
                <Switch
                  id="letterhead-preview-blank"
                  checked={previewBlank}
                  onChange={setPreviewBlank}
                  label="نسخه خالی"
                />
              }
            />
            <CardBody className="bg-card-2/50 p-3 sm:p-5">
              {!previewBlank ? (
                <div className="mb-3 flex flex-wrap items-center gap-1 rounded-field border border-line bg-card px-2 py-1.5">
                  {(
                    [
                      { icon: 'bold' as const, cmd: 'bold', label: 'بولد' },
                      { icon: 'italic' as const, cmd: 'italic', label: 'ایتالیک' },
                      { icon: 'underline' as const, cmd: 'underline', label: 'زیرخط' },
                    ] as const
                  ).map((item) => (
                    <Button
                      key={item.cmd}
                      variant="ghost"
                      size="sm"
                      icon={item.icon}
                      title={item.label}
                      aria-label={item.label}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => exec(item.cmd)}
                    />
                  ))}
                  <span className="mx-1 h-5 w-px bg-line" />
                  {(
                    [
                      { icon: 'align-right' as const, cmd: 'justifyRight', label: 'راست‌چین' },
                      { icon: 'align-center' as const, cmd: 'justifyCenter', label: 'وسط‌چین' },
                      { icon: 'align-left' as const, cmd: 'justifyLeft', label: 'چپ‌چین' },
                    ] as const
                  ).map((item) => (
                    <Button
                      key={item.cmd}
                      variant="ghost"
                      size="sm"
                      icon={item.icon}
                      title={item.label}
                      aria-label={item.label}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => exec(item.cmd)}
                    />
                  ))}
                  <span className="mx-1 h-5 w-px bg-line" />
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-fg-muted" title="رنگ متن">
                    رنگ
                    <input
                      type="color"
                      defaultValue="#111111"
                      className="h-6 w-8 cursor-pointer rounded border border-line bg-card p-0.5"
                      onMouseDown={(event) => event.stopPropagation()}
                      onChange={(event) => exec('foreColor', event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
              <LetterheadPreview
                address={address}
                values={values}
                blank={previewBlank}
                editing={!previewBlank}
                editorRef={editorRef}
                onBodyInput={(html) => set('body', html)}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
