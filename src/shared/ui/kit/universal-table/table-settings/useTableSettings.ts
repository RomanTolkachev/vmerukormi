import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { isEqualByJson } from "@/shared/ui/kit/universal-table/table-settings/lib/equals";
import { TableOptionsMutations } from "@/shared/ui/kit/universal-table/table-settings/table-options-mutations";
import { TableOptionsQueries } from "@/shared/ui/kit/universal-table/table-settings/table-options-queries";
import type { IColumnsConfig, ITableConfig, TableOptionsPatch } from "@/shared/ui/kit/universal-table/table-settings/types";
import { mergeUniversalTableSavedQuery } from "@/shared/ui/kit/universal-table/table-settings/savedState";

export type SetTableSettingsPatch = Omit<TableOptionsPatch, 'tableName'>;

export type UseTableSettingsResult<T extends IColumnsConfig | undefined = undefined> = {
	options: T extends IColumnsConfig ? ITableConfig : ITableConfig | undefined;
	/** Последнее загруженное или успешно сохранённое отображение, без локальных правок. */
	savedColumns: IColumnsConfig | undefined;
	savedQuery: Record<string, unknown> | undefined;
	/** Обновляет только локальную рабочую копию, без записи на бэк. */
	setOptions: (patch: SetTableSettingsPatch) => void;
	/** Явно сохраняет переданные секции; остальные берутся из последней записи на бэке. */
	saveOptions: (patch: SetTableSettingsPatch) => Promise<void>;
	isPending: boolean;
	isError: boolean;
	error: Error | null;
};

function tableConfigEqual(a: ITableConfig, b: ITableConfig): boolean {
	if (a.tableName !== b.tableName) return false;
	if (!isEqualByJson(a.columns, b.columns)) return false;
	return isEqualByJson(a.query ?? null, b.query ?? null);
}

export function useTableSettings<T extends IColumnsConfig | undefined = undefined>(
	tableName: ITableConfig["tableName"],
	fallbackColumns?: T,
	/** Загружать и сохранять пользовательские настройки на бэке. */
	shouldFetchUserSettings: boolean = true,
): UseTableSettingsResult<T> {
	const queryClient = useQueryClient();
	const getTableOptionsQuery = TableOptionsQueries.get({ tableName });

	const {
		data: savedOptions,
		isPending,
		isError,
		error,
	} = useQuery({ ...getTableOptionsQuery, enabled: shouldFetchUserSettings });

	const { mutateAsync } = useMutation(TableOptionsMutations.update(tableName));
	// В режиме без API точка сохранения существует только в текущем экземпляре таблицы.
	const [localSaved, setLocalSaved] = useState<SetTableSettingsPatch & {tableName: string} | null>(null);

	const [localValue, setLocalValue] = useState<ITableConfig | undefined>(() => {
		const cached = shouldFetchUserSettings
			? (queryClient.getQueryData(getTableOptionsQuery.queryKey) as
					| { columns?: IColumnsConfig | null; query?: Record<string, unknown> | null }
					| undefined)
			: undefined;

		if (cached?.columns) {
			return { tableName, columns: cached.columns, query: cached.query ?? undefined };
		}
		if (fallbackColumns) {
			return {
				tableName,
				columns: fallbackColumns,
				query: cached?.query ?? undefined,
			};
		}
		return undefined;
	});

	if (localValue?.tableName !== tableName) {
    const cached = shouldFetchUserSettings ? queryClient.getQueryData<{ columns?: IColumnsConfig | null; query?: Record<string, unknown> | null }>(getTableOptionsQuery.queryKey) : undefined;
    const columns = cached?.columns ?? fallbackColumns;
    if (columns) setLocalValue({ tableName, columns, query: cached?.query ?? undefined });
  }

	const localValueRef = useRef(localValue);

	useEffect(() => {
		localValueRef.current = localValue;
	}, [localValue]);

	const createNextConfig = useCallback(
		(patch: SetTableSettingsPatch): ITableConfig | undefined => {
			const prev = localValueRef.current;
			const baseColumns = patch.columns ?? prev?.columns;
			if (!baseColumns) return undefined;

			return {
				tableName,
				columns: baseColumns,
				query: mergeUniversalTableSavedQuery(prev?.query, patch.query, patch.queryScope) ?? undefined,
			};
		},
		[tableName],
	);

	const setOptions = useCallback(
		(patch: SetTableSettingsPatch) => {
			const prev = localValueRef.current;
			const next = createNextConfig(patch);
			if (!next) return;

			if (prev && tableConfigEqual(prev, next)) return;

			localValueRef.current = next;
			setLocalValue(next);
		},
		[createNextConfig],
	);

	const saveOptions = useCallback(
		async (patch: SetTableSettingsPatch) => {
			const next = createNextConfig(patch);
			if (!next) return;

			if (!shouldFetchUserSettings) {
				localValueRef.current = next;
				setLocalValue(next);
				setLocalSaved(previous => {
					const saved = previous?.tableName === tableName ? previous : undefined;
					return {
						tableName,
						columns: patch.columns ?? saved?.columns,
						query: mergeUniversalTableSavedQuery(saved?.query, patch.query, patch.queryScope) ?? undefined,
					};
				});
				return;
			}

			localValueRef.current = next;
			setLocalValue(next);
			const result = await mutateAsync({ tableName, ...patch });
			queryClient.setQueryData(getTableOptionsQuery.queryKey, result.options);
		},
		[
			createNextConfig,
			getTableOptionsQuery.queryKey,
			mutateAsync,
			queryClient,
			shouldFetchUserSettings,
			tableName,
		],
	);

	const hasFallback = fallbackColumns != null;

	return {
		options: localValue as T extends IColumnsConfig ? ITableConfig : ITableConfig | undefined,
		savedColumns: shouldFetchUserSettings
			? savedOptions?.columns ?? undefined
			: localSaved?.tableName === tableName ? localSaved.columns : undefined,
		savedQuery: shouldFetchUserSettings
			? savedOptions?.query ?? undefined
			: localSaved?.tableName === tableName ? localSaved.query : undefined,
		setOptions,
		saveOptions,
		// A disabled query is pending without fetching. It must not hide a rows error behind a loader.
		isPending: shouldFetchUserSettings && isPending && !hasFallback,
		isError: shouldFetchUserSettings && isError && !hasFallback,
		error: shouldFetchUserSettings && isError && !hasFallback ? (error ?? null) : null,
	};
}

