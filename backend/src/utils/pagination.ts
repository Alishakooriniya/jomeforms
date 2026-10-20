import type { ListOptions } from '../types/domain.js';

export interface ListQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export function toListOptions(query: ListQuery): ListOptions {
  return {
    page: query.page,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    search: query.search?.trim() || undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}
