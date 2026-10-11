/* صفحه‌بندی جدول‌ها */

import { cn } from '../../lib/utils';
import { displayDigits } from '../../lib/format';
import { Icon } from './Icon';

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function pageWindow(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const items: Array<number | 'gap'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < pageCount - 1) items.push('gap');
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 px-3 py-3', className)}>
      <p className="num text-[11.5px] text-fg-subtle">
        نمایش {displayDigits(first)} تا {displayDigits(last)} از {displayDigits(total)} مورد
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
            <span className="hidden sm:inline">تعداد در صفحه</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="field num h-8 w-16 py-0 text-[12px]"
              aria-label="تعداد در صفحه"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {displayDigits(size)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <nav className="flex items-center gap-1" aria-label="صفحه‌بندی">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn btn-secondary btn-sm"
            aria-label="صفحه قبل"
          >
            <Icon name="chevron-right" size={14} />
          </button>

          {pageWindow(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-fg-subtle">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'num btn btn-sm h-8 min-w-8 px-2',
                  item === page ? 'bg-brand-600 text-white' : 'btn-secondary',
                )}
              >
                {displayDigits(item)}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className="btn btn-secondary btn-sm"
            aria-label="صفحه بعد"
          >
            <Icon name="chevron-left" size={14} />
          </button>
        </nav>
      </div>
    </div>
  );
}
