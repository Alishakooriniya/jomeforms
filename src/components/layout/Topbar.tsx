/* نوار بالای صفحه */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthProvider';
import { useDb } from '../../store/DataProvider';
import { ROLE_LABELS } from '../../data/labels';
import { displayDigits } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownItem } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { GlobalSearch } from './GlobalSearch';
import { ThemeMenu } from './ThemeMenu';

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, can, logout } = useAuth();
  const { documents } = useDb();
  const navigate = useNavigate();
  if (!user) return null;

  const pending = can('documents.view')
    ? documents.filter((document) => document.status === 'awaiting_signature')
    : [];

  const userItems: DropdownItem[] = [
    { id: 'profile', label: 'پروفایل', icon: 'user', onSelect: () => navigate('/profile') },
    ...(can('settings.view')
      ? [{ id: 'settings', label: 'تنظیمات سامانه', icon: 'settings' as const, onSelect: () => navigate('/settings') }]
      : []),
    { id: 'divider', label: '', separator: true, onSelect: () => {} },
    { id: 'logout', label: 'خروج از حساب', icon: 'logout', danger: true, onSelect: logout },
  ];

  const pendingItems: DropdownItem[] = pending.length
    ? [
        ...pending.slice(0, 5).map((document) => ({
          id: document.id,
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
    : [
        {
          id: 'empty',
          label: 'سندی در انتظار امضا نیست',
          icon: 'check' as const,
          disabled: true,
          onSelect: () => {},
        },
      ];

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
          {can('documents.view') ? (
            <div className="relative">
              <Dropdown items={pendingItems} label="کارهای در انتظار" icon="bell" />
              {pending.length ? (
                <span className="num pointer-events-none absolute -top-0.5 start-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warn px-1 text-[9px] font-medium text-white">
                  {displayDigits(pending.length)}
                </span>
              ) : null}
            </div>
          ) : null}

          <ThemeMenu />

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
