/* نوار بالای صفحه */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthProvider';
import { useTheme } from '../../store/ThemeProvider';
import { useDb, useDbActions } from '../../store/DataProvider';
import { ROLE_LABELS } from '../../data/labels';
import { reminderState } from '../../lib/reminders';
import { displayDigits } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownItem } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { GlobalSearch } from './GlobalSearch';

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, can, logout } = useAuth();
  const theme = useTheme();
  const { documents, reminders } = useDb();
  const { markReminderDone } = useDbActions();
  const navigate = useNavigate();

  // یادآورها به زمان گره خورده‌اند؛ هر نیم‌دقیقه دوباره ارزیابی می‌شوند
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const now = new Date(nowTick);
  const pending = can('documents.view')
    ? documents.filter((document) => document.status === 'awaiting_signature')
    : [];
  const dueReminders = reminders.filter(
    (reminder) => reminder.userId === user.id && reminderState(reminder, now) === 'active',
  );
  const notificationCount = pending.length + dueReminders.length;

  const userItems: DropdownItem[] = [
    { id: 'profile', label: 'پروفایل', icon: 'user', onSelect: () => navigate('/profile') },
    ...(can('settings.view')
      ? [{ id: 'settings', label: 'تنظیمات سامانه', icon: 'settings' as const, onSelect: () => navigate('/settings') }]
      : []),
    { id: 'divider', label: '', separator: true, onSelect: () => {} },
    { id: 'logout', label: 'خروج از حساب', icon: 'logout', danger: true, onSelect: logout },
  ];

  const reminderItems: DropdownItem[] = dueReminders.slice(0, 5).map((reminder) => ({
    id: `reminder-${reminder.id}`,
    label:
      reminder.title.slice(0, 48) +
      (reminder.title.length > 48 ? '…' : '') +
      (reminder.time ? ` · ${displayDigits(reminder.time)}` : ''),
    icon: 'bell' as const,
    onSelect: () => markReminderDone(reminder.id),
  }));

  const documentItems: DropdownItem[] = pending.length
    ? [
        ...pending.slice(0, 5).map((document) => ({
          id: `doc-${document.id}`,
          label: `${document.title} — ${document.clientName ?? 'بدون پرونده'}`,
          icon: 'file-text' as const,
          onSelect: () => navigate(`/documents/${document.id}`),
        })),
        { id: 'gap', label: '', separator: true, onSelect: () => {} },
        {
          id: 'all',
          label: 'مشاهده همه اسناد در انتظار امضا',
          icon: 'list' as const,
          onSelect: () => navigate('/documents?status=awaiting_signature'),
        },
      ]
    : [];

  const notificationItems: DropdownItem[] = [
    ...reminderItems,
    ...(reminderItems.length && documentItems.length
      ? [{ id: 'sep', label: '', separator: true, onSelect: () => {} }]
      : []),
    ...documentItems,
    ...(can('reminders.manage')
      ? [
          ...(reminderItems.length || documentItems.length
            ? [{ id: 'sep-manage', label: '', separator: true, onSelect: () => {} }]
            : []),
          {
            id: 'manage',
            label: 'مدیریت یادآورها',
            icon: 'settings' as const,
            onSelect: () => navigate('/reminders'),
          },
        ]
      : []),
  ];

  if (!notificationItems.length) {
    notificationItems.push({
      id: 'empty',
      label: 'اعلانی ندارید',
      icon: 'check',
      disabled: true,
      onSelect: () => {},
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          icon="menu"
          label="منو"
          onClick={onOpenMenu}
          className="lg:hidden"
        />

        <GlobalSearch />

        <div className="ms-auto flex items-center gap-1">
          <div className="relative">
            <Dropdown items={notificationItems} label="اعلان‌ها" icon="bell" />
            {notificationCount ? (
              <span className="num pointer-events-none absolute -top-0.5 start-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warn px-1 text-[9px] font-medium text-white">
                {displayDigits(notificationCount)}
              </span>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            icon={theme.isDark ? 'sun' : 'moon'}
            label="تغییر پوسته"
            onClick={theme.toggleMode}
          />

          <Dropdown
            items={userItems}
            label="حساب کاربری"
            trigger={
              <span className="flex items-center gap-2 px-1">
                <Avatar name={user.fullName} size={26} />
                <span className="hidden text-start sm:block">
                  <span className="block text-[12.5px] font-medium leading-5 text-fg">{user.fullName}</span>
                  <span className="block text-[10.5px] leading-4 text-fg-subtle">{ROLE_LABELS[user.role]}</span>
                </span>
                <Icon name="chevron-down" size={13} className="text-fg-subtle" />
              </span>
            }
            buttonVariant="ghost"
          />
        </div>
      </div>
    </header>
  );
}
