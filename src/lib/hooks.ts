/* هوک‌های مشترک برنامه — از جمله موتور جستجو/فیلتر/مرتب‌سازی فهرست‌ها */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { normalizeText } from './utils';

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export interface Disclosure {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useDisclosure(initial = false): Disclosure {
  const [isOpen, setOpen] = useState(initial);
  return {
    isOpen,
    open: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
    toggle: useCallback(() => setOpen((prev) => !prev), []),
  };
}

export function useClickOutside<T extends HTMLElement>(ref: RefObject<T | null>, handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler, active]);
}

/* ---------------------------- موتور فهرست‌ها ---------------------------- */

export interface ListQueryOptions<T> {
  /** متن قابل جستجو برای هر ردیف */
  search?: (row: T) => string;
  /** فیلترها: کلید = نام فیلتر، مقدار = تابع بررسی */
  filters?: Record<string, (row: T, value: string) => boolean>;
  /** مرتب‌سازی: کلید = نام ستون */
  sorters?: Record<string, (a: T, b: T) => number>;
  /** مقادیر اولیه فیلترها (مثلاً خوانده‌شده از پارامترهای نشانی) */
  initialFilters?: Record<string, string>;
  pageSize?: number;
}

export interface ListQuery<T> {
  q: string;
  setQ: (value: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
  sortKey?: string;
  sortDir: 'asc' | 'desc';
  toggleSort: (key: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  rows: T[];
  pageRows: T[];
  total: number;
  pageCount: number;
}

/**
 * جستجو + فیلتر + مرتب‌سازی + صفحه‌بندی در یک جا، تا همه فهرست‌ها
 * رفتار یکسان داشته باشند و کد صفحه‌ها کوتاه بماند.
 */
export function useListQuery<T>(allRows: T[], options: ListQueryOptions<T>): ListQuery<T> {
  // برای اینکه توابع پاس‌داده‌شده باعث محاسبه مجدد بی‌مورد نشوند
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [q, setQRaw] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(() => options.initialFilters ?? {});
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(options.pageSize ?? 10);

  const setQ = useCallback((value: string) => {
    setQRaw(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearAll = useCallback(() => {
    setFilters({});
    setQRaw('');
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const rows = useMemo(() => {
    const config = optionsRef.current;
    let output = allRows;

    if (config.filters) {
      Object.entries(filters).forEach(([key, value]) => {
        const predicate = config.filters?.[key];
        if (predicate && value && value !== 'all') output = output.filter((row) => predicate(row, value));
      });
    }

    const needle = normalizeText(q);
    if (needle && config.search) {
      output = output.filter((row) => normalizeText(config.search?.(row) ?? '').includes(needle));
    }

    const sorter = sortKey ? config.sorters?.[sortKey] : undefined;
    if (sorter) {
      const copy = [...output];
      copy.sort((a, b) => (sortDir === 'asc' ? sorter(a, b) : -sorter(a, b)));
      output = copy;
    }

    return output;
  }, [allRows, filters, q, sortKey, sortDir]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  const hasActiveFilters =
    q.trim().length > 0 || Object.values(filters).some((value) => value && value !== 'all');

  return {
    q,
    setQ,
    filters,
    setFilter,
    clearAll,
    hasActiveFilters,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    rows,
    pageRows,
    total,
    pageCount,
  };
}
