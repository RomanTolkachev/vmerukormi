import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";
import { isEqualByJson } from "@/shared/ui/kit/universal-table/table-settings/lib/equals";

const LIST_QUERY_KEYS = new Set(['page', 'per_page', 'search', 'sort_col', 'sort_dir'])

/** Сравниваем применённые условия с defaults таблицы, а не с сохранённым пресетом. */
export function hasNonDefaultFilters<TQuery extends TableBaseQuery>(query: TQuery, defaults: TQuery, searchKey = 'search'): boolean {
  const keys = new Set([...Object.keys(query), ...Object.keys(defaults)])
  return [...keys].some(key => {
    if (LIST_QUERY_KEYS.has(key) || key === searchKey) return false
    return !isEqualByJson(normalizeEmpty(query[key as keyof TQuery]), normalizeEmpty(defaults[key as keyof TQuery]))
  })
}

function normalizeEmpty(value: unknown): unknown {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0) ? null : value
}

