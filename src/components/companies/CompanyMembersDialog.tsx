/* پنجره اتصال کاربران به یک مجموعه — تیک‌زدن کاربران و ذخیره یک‌باره */

import { useEffect, useMemo, useState } from 'react';
import type { Company, User } from '../../types';
import { normalizeText } from '../../lib/utils';
import { ROLE_LABELS } from '../../data/labels';
import { displayDigits } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { SearchInput } from '../ui/Toolbar';

export interface CompanyMembersDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  users: User[];
  companies: Company[];
  onSave: (userIds: string[]) => void;
  saving?: boolean;
}

export function CompanyMembersDialog({
  open,
  onClose,
  company,
  users,
  companies,
  onSave,
  saving,
}: CompanyMembersDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open || !company) return;
    setSelected(users.filter((user) => user.companyId === company.id).map((user) => user.id));
    setQuery('');
  }, [open, company, users]);

  const companyName = (id?: string) => companies.find((item) => item.id === id)?.name;

  const visible = useMemo(() => {
    const needle = normalizeText(query);
    const sorted = [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'fa'));
    if (!needle) return sorted;
    return sorted.filter((user) =>
      normalizeText(`${user.fullName} ${user.username} ${user.title ?? ''} ${companyName(user.companyId) ?? ''}`).includes(
        needle,
      ),
    );
  }, [users, query, companies]);

  const toggle = (userId: string) =>
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));

  const initialIds = useMemo(
    () => (company ? users.filter((user) => user.companyId === company.id).map((user) => user.id) : []),
    [company, users],
  );
  const added = selected.filter((id) => !initialIds.includes(id)).length;
  const removed = initialIds.filter((id) => !selected.includes(id)).length;
  const dirty = added > 0 || removed > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon="link"
      title={company ? `اتصال کاربران به «${company.name}»` : 'اتصال کاربران'}
      description="کاربران تیک‌خورده به این مجموعه وصل می‌شوند و تیک‌برداشتن‌ها از مجموعه جدا می‌شوند."
      footer={
        <>
          <span className="me-auto text-[11.5px] text-fg-subtle">
            {dirty ? (
              <>
                {added ? `${displayDigits(added)} اتصال` : ''}
                {added && removed ? ' • ' : ''}
                {removed ? `${displayDigits(removed)} جدایی` : ''}
              </>
            ) : (
              'تغییری ثبت نشده است'
            )}
          </span>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            انصراف
          </Button>
          <Button variant="primary" icon="save" loading={saving} disabled={!dirty} onClick={() => onSave(selected)}>
            ذخیره ارتباط‌ها
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="جستجوی نام، نام کاربری یا مجموعه…" />

        <div className="max-h-[46vh] overflow-y-auto rounded-card border border-line">
          {visible.length ? (
            <ul className="divide-y divide-line">
              {visible.map((user) => {
                const checked = selected.includes(user.id);
                const otherCompany = user.companyId && user.companyId !== company?.id ? companyName(user.companyId) : undefined;
                return (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-card-2">
                      <Checkbox checked={checked} onChange={() => toggle(user.id)} aria-label={user.fullName} />
                      <Avatar name={user.fullName} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-fg">{user.fullName}</span>
                        <span className="num block truncate text-[10.5px] text-fg-subtle" dir="ltr">
                          {user.username}
                          {user.active ? '' : ' — غیرفعال'}
                        </span>
                      </span>
                      {otherCompany ? (
                        <Badge tone="warn" size="sm">
                          منتقل از: {otherCompany}
                        </Badge>
                      ) : null}
                      <Badge tone={user.role === 'superadmin' ? 'brand' : 'neutral'} size="sm">
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-[12px] text-fg-subtle">کاربری با این جستجو پیدا نشد.</p>
          )}
        </div>

        <p className="flex items-start gap-2 rounded-card border border-line bg-card-2/50 px-3 py-2 text-[11.5px] leading-5 text-fg-muted">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          هر کاربر می‌تواند بدون مجموعه باشد؛ اگر کاربری به مجموعه دیگری وصل است با تیک‌زدن، به این مجموعه منتقل می‌شود.
        </p>
      </div>
    </Modal>
  );
}
