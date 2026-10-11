/* جستجوی سراسری — در هدر قرار دارد و با Ctrl+K فعال می‌شود */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, normalizeText } from '../../lib/utils';
import { useClickOutside } from '../../lib/hooks';
import { useAuth } from '../../store/AuthProvider';
import { useDb } from '../../store/DataProvider';
import { CLIENT_STATUS_LABELS, DOC_STATUS_LABELS } from '../../data/labels';
import { formatCode } from '../../lib/format';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

interface SearchResult {
  id: string;
  group: string;
  label: string;
  sub: string;
  to: string;
  icon: IconName;
}

export function GlobalSearch() {
  const { clients, documents, templates, users } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  // میان‌بر Ctrl+K
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const needle = normalizeText(query);
    if (needle.length < 2) return [];
    const output: SearchResult[] = [];

    if (can('clients.view')) {
      clients
        .filter((client) =>
          normalizeText([client.fullName, client.code, client.mobile, client.nationalId, client.city].join(' ')).includes(
            needle,
          ),
        )
        .slice(0, 4)
        .forEach((client) =>
          output.push({
            id: `client-${client.id}`,
            group: 'پرونده‌ها',
            label: client.fullName,
            sub: `${formatCode(client.code)} — ${CLIENT_STATUS_LABELS[client.status]}`,
            to: `/clients/${client.id}`,
            icon: 'user',
          }),
        );
    }

    if (can('documents.view')) {
      documents
        .filter((document) =>
          normalizeText([document.title, document.number, document.clientName ?? ''].join(' ')).includes(needle),
        )
        .slice(0, 4)
        .forEach((document) =>
          output.push({
            id: `document-${document.id}`,
            group: 'اسناد',
            label: document.title,
            sub: `${formatCode(document.number)} — ${DOC_STATUS_LABELS[document.status]}`,
            to: `/documents/${document.id}`,
            icon: 'file-text',
          }),
        );
    }

    if (can('templates.view')) {
      templates
        .filter((template) => normalizeText(`${template.title} ${template.description ?? ''}`).includes(needle))
        .slice(0, 3)
        .forEach((template) =>
          output.push({
            id: `template-${template.id}`,
            group: 'قالب‌ها',
            label: template.title,
            sub: `${template.fields.length} فیلد`,
            to: `/templates/${template.id}`,
            icon: 'template',
          }),
        );
    }

    if (can('users.view')) {
      users
        .filter((user) => normalizeText(`${user.fullName} ${user.username}`).includes(needle))
        .slice(0, 3)
        .forEach((user) =>
          output.push({
            id: `user-${user.id}`,
            group: 'کاربران',
            label: user.fullName,
            sub: user.username,
            to: `/users/${user.id}`,
            icon: 'user-cog',
          }),
        );
    }

    return output;
  }, [query, clients, documents, templates, users, can]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach((result) => {
      const list = map.get(result.group) ?? [];
      list.push(result);
      map.set(result.group, list);
    });
    return Array.from(map.entries());
  }, [results]);

  const go = (to: string) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md" ref={containerRef}>
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle">
        <Icon name="search" size={15} />
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) go(results[0].to);
        }}
        placeholder="جستجوی پرونده، سند، قالب…"
        className="field ps-9 pe-14"
        aria-label="جستجوی سراسری"
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-line bg-card-2 px-1.5 py-0.5 text-[10px] text-fg-subtle sm:flex">
        Ctrl K
      </span>

      {open && query.trim().length >= 2 ? (
        <div className="animate-pop absolute top-full z-50 mt-1.5 max-h-[70vh] w-full overflow-y-auto rounded-card border border-line bg-card p-1.5 shadow-soft">
          {grouped.length ? (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1 text-[10.5px] text-fg-subtle">{group}</p>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => go(item.to)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-btn px-2 py-2 text-start transition-colors hover:bg-card-2',
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-field bg-card-2 text-fg-muted">
                          <Icon name={item.icon} size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] text-fg">{item.label}</span>
                          <span className="block truncate text-[10.5px] text-fg-subtle">{item.sub}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-[12px] text-fg-subtle">نتیجه‌ای یافت نشد.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
