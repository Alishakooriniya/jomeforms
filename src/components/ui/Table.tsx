/* جدول داده — یک پیاده‌سازی سبک برای همه فهرست‌های برنامه */

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  className?: string;
  /** مخفی‌کردن ستون در موبایل: مقدار کلاس مثل 'hidden md:table-cell' */
  responsiveClass?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Array<Column<T>>;
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  dense?: boolean;
  className?: string;
}

const ALIGN_CLASS = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading,
  empty,
  sortKey,
  sortDir = 'asc',
  onSort,
  onRowClick,
  footer,
  dense,
  className,
}: DataTableProps<T>) {
  const cellPadding = dense ? 'px-3 py-2' : 'px-3 py-2.5';

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[36rem] border-collapse">
        <thead>
          <tr className="border-b border-line bg-card-2/70">
            {columns.map((column) => {
              const active = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn('th', ALIGN_CLASS[column.align ?? 'start'], column.responsiveClass)}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-fg',
                        active && 'text-brand-600 dark:text-brand-400',
                      )}
                    >
                      {column.header}
                      <Icon
                        name={active && sortDir === 'desc' ? 'chevron-down' : 'chevron-up'}
                        size={12}
                        className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-30')}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-b border-line/70">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('td', cellPadding, column.responsiveClass)}
                    >
                      <span className="skeleton block h-3.5 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-line/70 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-card-2',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'td',
                        cellPadding,
                        ALIGN_CLASS[column.align ?? 'start'],
                        column.className,
                        column.responsiveClass,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
        {footer ? <tfoot className="border-t border-line bg-card-2/60">{footer}</tfoot> : null}
      </table>

      {!loading && !rows.length ? <div className="py-2">{empty}</div> : null}
    </div>
  );
}
