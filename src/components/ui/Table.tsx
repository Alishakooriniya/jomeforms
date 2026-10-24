/* جدول داده — فشرده و تک‌خطی؛ برای همه فهرست‌های برنامه.
   قاعده مهم: محتوای سلول‌ها باید تک‌خطی بماند. متن بلند با truncate و
   tooltip (title) مدیریت می‌شود، نه با افزایش ارتفاع ردیف. */

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
  /** کلاس عرض ستون مثل `w-40` یا `max-w-56` */
  widthClassName?: string;
  /** مخفی‌کردن ستون در موبایل: مقدار کلاس مثل 'hidden md:table-cell' */
  responsiveClass?: string;
  /** ستون شناسایی اصلی؛ هنگام اسکرول افقی در موبایل ثابت می‌ماند */
  sticky?: boolean;
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
  const cellPadding = dense ? 'h-9 py-0' : '';

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[36rem] border-collapse">
        <thead>
          <tr className="border-b border-line bg-card-2/60">
            {columns.map((column) => {
              const active = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'th',
                    ALIGN_CLASS[column.align ?? 'start'],
                    column.widthClassName,
                    column.responsiveClass,
                    column.sticky && 'sticky start-0 z-20 border-e border-line/70 bg-card-2',
                  )}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-fg',
                        active && 'text-fg',
                      )}
                    >
                      {column.header}
                      <Icon
                        name={active && sortDir === 'desc' ? 'chevron-down' : 'chevron-up'}
                        size={11}
                        className={cn('transition-opacity', active ? 'opacity-80' : 'opacity-25')}
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
          {loading ? (
            Array.from({ length: 6 }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="border-b border-line/60">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'td',
                      cellPadding,
                      column.responsiveClass,
                      column.widthClassName,
                      column.sticky && 'sticky start-0 z-10 border-e border-line/70 bg-card',
                    )}
                  >
                    <span className="skeleton block h-3 w-full max-w-32" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'group border-b border-line/60 transition-colors last:border-b-0',
                  onRowClick && 'cursor-pointer hover:bg-card-2/70 focus-visible:bg-card-2/70',
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
                      column.widthClassName,
                      column.responsiveClass,
                      column.sticky && 'sticky start-0 z-10 border-e border-line/70 bg-card group-hover:bg-card-2/70',
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
        {footer && rows.length ? <tfoot className="border-t border-line bg-card-2/50">{footer}</tfoot> : null}
      </table>
    </div>
  );
}
