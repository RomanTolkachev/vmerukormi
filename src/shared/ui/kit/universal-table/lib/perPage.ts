import type { SelectOption } from "@/shared/ui/kit/inputs/SelectInput";
import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";

export const PER_PAGE_OPTIONS: readonly number[] = [10, 25, 50, 100]
export const DEFAULT_PER_PAGE = 25
export type PerPageValue = number

export function getPerPageOptions(): SelectOption[] {
  return PER_PAGE_OPTIONS.map(size => ({value: String(size), label: String(size)}))
}

/** URL and legacy settings cannot introduce additional page sizes. */
export function normalizePerPage(value: unknown): number {
  const size = typeof value === 'string' ? Number(value) : value
  return typeof size === 'number' && PER_PAGE_OPTIONS.includes(size) ? size : DEFAULT_PER_PAGE
}

export function normalizeTablePerPage<TQuery extends TableBaseQuery>(query: TQuery): TQuery {
  return {...query, per_page: normalizePerPage(query.per_page)}
}

