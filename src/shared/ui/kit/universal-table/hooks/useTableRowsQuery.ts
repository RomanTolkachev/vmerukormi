import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { sortColumns } from "@/shared/ui/kit/universal-table/lib/columns";
import { buildTableQueryKey } from "@/shared/ui/kit/universal-table/lib/query-key";
import { applySortToQuery } from "@/shared/ui/kit/universal-table/lib/sort";
import type { TableBaseQuery, UniversalTableColumnMeta, UniversalTableListResponse, UniversalTableQueryFnContext, UniversalTableSortableResolver } from "@/shared/ui/kit/universal-table/types";

type UseTableRowsQueryParams<
	TRow extends Record<string, unknown>,
	TQuery extends TableBaseQuery,
	TResponse extends UniversalTableListResponse,
	TQueryFnData,
> = {
	tableName: string;
	queryScopeKey?: string;
	queryState: TQuery;
	sortable?: readonly (keyof TRow)[] | UniversalTableSortableResolver<TResponse>;
	queryFn: (query: TQuery, context: UniversalTableQueryFnContext) => Promise<TQueryFnData>;
	queryOptions?: Omit<
		UseQueryOptions<TQueryFnData, Error, TResponse>,
		"queryKey" | "queryFn"
	>;
	mapRows?: (response: TResponse) => TRow[];
};

/**
 * Загрузка строк + производное состояние сортировки и нормализованных колонок.
 *
 * `sortable` может быть массивом имён или колбэком `(ctx) => string[]`. Колбэк
 * резолвится из ответа (`ctx.data`), поэтому whitelist доступен только после
 * первой загрузки — до неё считается пустым. Настройки отображения не влияют
 * на ключ запроса строк.
 *
 * `queryForFetch`: для массива нормализует sort по whitelist; для колбэка
 * отправляет sort как есть (валидацию делает бэк) — иначе на первом запросе
 * (data ещё нет) сохранённый sort_col был бы ошибочно вырезан. Резолвер вызывается
 * после подготовки настроек отображения, с полным контекстом UniversalTable.
 */
export function useTableRowsQuery<
	TRow extends Record<string, unknown>,
	TQuery extends TableBaseQuery,
	TResponse extends UniversalTableListResponse,
	TQueryFnData,
>({
	tableName,
	queryScopeKey,
	queryState,
	sortable,
	queryFn,
	queryOptions,
	mapRows,
}: UseTableRowsQueryParams<TRow, TQuery, TResponse, TQueryFnData>) {
	const isResolver = typeof sortable === "function";

	const staticSortable = useMemo<readonly string[] | undefined>(
		() =>
			isResolver
				? undefined
				: (sortable as readonly (string | number)[] | undefined)?.map(String),
		[isResolver, sortable],
	);

	const queryForFetch = useMemo(
		() => (isResolver ? queryState : applySortToQuery(queryState, staticSortable)),
		[isResolver, queryState, staticSortable],
	);

	const queryKey = useMemo(
		() => buildTableQueryKey(tableName, queryForFetch, queryScopeKey),
		[tableName, queryForFetch, queryScopeKey],
	);

	const rowsQuery = useQuery<TQueryFnData, Error, TResponse>({
		queryKey,
		queryFn: ({ signal }) => queryFn(queryForFetch, { signal }),
		placeholderData: keepPreviousData,
		...queryOptions,
	});

	const sortedColumns = useMemo<UniversalTableColumnMeta[]>(
		() => (rowsQuery.data?.columns ? sortColumns(rowsQuery.data.columns) : []),
		[rowsQuery.data],
	);

	const tableData = useMemo<TRow[]>(() => {
		if (!rowsQuery.data) return [];
		if (mapRows) return mapRows(rowsQuery.data);
		return rowsQuery.data.rows as TRow[];
	}, [rowsQuery.data, mapRows]);

	return { rowsQuery, queryForFetch, staticSortable, sortedColumns, tableData };
}

