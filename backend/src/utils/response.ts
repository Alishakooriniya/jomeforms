import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: PaginationMeta } = {},
): void {
  res.status(options.status ?? 200).json({
    success: true,
    data,
    ...(options.message ? { message: options.message } : {}),
    ...(options.meta ? { meta: options.meta } : {}),
  });
}

export function sendPaginated<T>(
  res: Response,
  result: Paginated<T>,
  page: number,
  limit: number,
): void {
  sendSuccess(res, result.items, {
    meta: buildPaginationMeta(page, limit, result.total),
  });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
