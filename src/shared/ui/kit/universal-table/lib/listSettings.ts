import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";
import { resolveTableSort } from "@/shared/ui/kit/universal-table/lib/sort";
import { normalizePerPage } from "@/shared/ui/kit/universal-table/lib/perPage";

/** Только параметры списка; фильтры, поиск и текущая страница сюда не входят. */
export function getTableListSettings(query: TableBaseQuery, sortableColumns: readonly string[]) {
  const {sortCol, sortDir} = resolveTableSort(query, sortableColumns)
  return {sort_col: sortCol, sort_dir: sortDir, per_page: normalizePerPage(query.per_page)}
}

