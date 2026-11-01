import { useCallback, useMemo } from "react";
import type { ColumnOrderState, ColumnSizingState, VisibilityState } from "@tanstack/react-table";
import type { IColumnsConfig } from "@/shared/ui/kit/universal-table/table-settings/types";
import { isEqualByJson } from "@/shared/ui/kit/universal-table/table-settings/lib/equals";
import { useTableSettings } from "@/shared/ui/kit/universal-table/table-settings/useTableSettings";
import { buildColumnLabels, buildColumnsConfigFromMeta } from "@/shared/ui/kit/universal-table/lib/columns";
import { ACTIONS_COLUMN_ID } from "@/shared/ui/kit/universal-table/lib/CreateActionsColumn";
import { mergeColumnsConfig, normalizeColumnsConfig } from "@/shared/ui/kit/universal-table/lib/mergeColumnsConfig";
import { areDisplaySettingsEqual } from "@/shared/ui/kit/universal-table/lib/areDisplaySettingsEqual";
import { getPinnedColumnOrder } from "@/shared/ui/kit/universal-table/lib/columnPinning";
import type { UniversalTableColumnMeta, UniversalTableCustomColumnMeta, UniversalTableSettingsOpenPayload } from "@/shared/ui/kit/universal-table/types";

const EMPTY_CUSTOM_META: UniversalTableCustomColumnMeta[] = [];

type UseTableColumnsParams<TRow extends Record<string, unknown>> = {
	tableName: string;
	sortedColumns: UniversalTableColumnMeta[];
	hasActions: boolean;
	/** Мета кастомных колонок — чтобы они попали в настройки видимости. */
	customColumnsMeta?: UniversalTableCustomColumnMeta[];
	columnSizeData?: Partial<Record<Extract<keyof TRow, string>, number>>;
	defaultCard?: boolean;
	compact?: boolean;
	shouldFetchUserSettings: boolean;
	/** Колонки, которые всегда должны оставаться видимыми. */
	persistColumns?: readonly string[];
};

export function useTableColumns<TRow extends Record<string, unknown>>({
	tableName,
	sortedColumns,
	hasActions,
	customColumnsMeta,
	columnSizeData,
	defaultCard = false,
	compact = false,
	shouldFetchUserSettings,
	persistColumns,
}: UseTableColumnsParams<TRow>) {
	const customMeta = customColumnsMeta ?? EMPTY_CUSTOM_META;
	const persistColumnsKey = JSON.stringify(persistColumns ?? []);
	const persistedColumnIds = useMemo<readonly string[]>(
		() => JSON.parse(persistColumnsKey),
		[persistColumnsKey],
	);
	const forcePersistColumnsVisible = useCallback(
		(visible: VisibilityState): VisibilityState => {
			if (persistedColumnIds.length === 0) return visible;
			const next = { ...visible };
			for (const id of persistedColumnIds) delete next[id];
			return next;
		},
		[persistedColumnIds],
	);

	const columnLabels = useMemo(() => {
		const labels = buildColumnLabels(sortedColumns);
		for (const c of customMeta) labels[c.id] = c.label;
		return labels;
	}, [sortedColumns, customMeta]);
	const columnIds = useMemo(
		() => [...sortedColumns.map(c => c.name), ...customMeta.map(c => c.id)],
		[sortedColumns, customMeta],
	);
	const columnsConfigFromMeta = useMemo(() => {
		if (sortedColumns.length === 0 && customMeta.length === 0) return undefined;
		const base =
			sortedColumns.length > 0
				? buildColumnsConfigFromMeta(sortedColumns)
				: { order: [], visible: {}, resized: {} };
		const order = [...base.order, ...customMeta.map(c => c.id)];
		const visible = { ...base.visible };
		for (const c of customMeta) if (c.defaultHidden) visible[c.id] = false;
		const resized: Record<string, number> = { ...base.resized };
		for (const [id, width] of Object.entries(columnSizeData ?? {})) {
			if (typeof width === "number" && width > 0) resized[id] = Math.round(width);
		}
		for (const c of customMeta) if (c.width && c.width > 0) resized[c.id] = c.width;
		return { order, visible: forcePersistColumnsVisible(visible), resized, view: defaultCard ? "cards" as const : "table" as const, compact };
	}, [sortedColumns, customMeta, forcePersistColumnsVisible, columnSizeData, defaultCard, compact]);

	const {
		options,
		savedColumns,
		savedQuery,
		setOptions,
		saveOptions,
		isPending: isOptionsPending,
		error: optionsError,
	} = useTableSettings(
		tableName,
		columnsConfigFromMeta,
		shouldFetchUserSettings,
	);

	const columnsConfig = useMemo(() => {
		if (!options?.columns) return undefined;
		const merged = !columnsConfigFromMeta
			? normalizeColumnsConfig(options.columns)
			: mergeColumnsConfig(options.columns, columnsConfigFromMeta);
		return { ...merged, visible: forcePersistColumnsVisible(merged.visible) };
	}, [options, columnsConfigFromMeta, forcePersistColumnsVisible]);
	const hasDisplayChanges = useMemo(() => {
		if (!columnsConfig || !columnsConfigFromMeta) return false;
		const saved = mergeColumnsConfig(savedColumns ?? columnsConfigFromMeta, columnsConfigFromMeta);
		return !areDisplaySettingsEqual(columnsConfig, {
			...saved,
			visible: forcePersistColumnsVisible(saved.visible),
		});
	}, [columnsConfig, columnsConfigFromMeta, savedColumns, forcePersistColumnsVisible]);

	const getSettingsPayload = (): UniversalTableSettingsOpenPayload | null => {
  if (!columnsConfig || !columnsConfigFromMeta) return null;
  return {
   columnIds,
   columnLabels,
   persistColumns: persistedColumnIds,
   columns: columnsConfig,
   defaults: columnsConfigFromMeta,
   hasDisplayChanges,
   savedQuery,
   update: columns => setOptions({ columns: { ...columns, visible: forcePersistColumnsVisible(columns.visible) } }),
   saveDisplay: query => saveOptions({ columns: columnsConfig, query, queryScope: 'listSettings' }),
   saveQuery: query => saveOptions({ query, queryScope: 'filters' }),
  };
 };

	const columnsOrder = useMemo<ColumnOrderState>(() => {
		if (!columnsConfig) return [];
		const order = getPinnedColumnOrder(columnsConfig.order, columnsConfig.pinned).filter(id => id !== ACTIONS_COLUMN_ID);
		return hasActions ? [...order, ACTIONS_COLUMN_ID] : order;
	}, [columnsConfig, hasActions]);

	const columnVisible = useMemo<VisibilityState | undefined>(() => {
		if (!columnsConfig) return undefined;
		if (!hasActions) return columnsConfig.visible;
		return { ...columnsConfig.visible, [ACTIONS_COLUMN_ID]: true };
	}, [columnsConfig, hasActions]);

	const updateColumnsConfig = useCallback(
		<K extends keyof IColumnsConfig>(key: K, next: IColumnsConfig[K]) => {
			if (!columnsConfig) return;
			const prev = columnsConfig[key];
			if (isEqualByJson(prev, next)) return;
			setOptions({ columns: { ...columnsConfig, [key]: next } });
		},
		[columnsConfig, setOptions],
	);

	const onColumnsOrderChange = useCallback(
		(updater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => {
			const prev = columnsConfig?.order ?? [];
			updateColumnsConfig("order", typeof updater === "function" ? updater(prev) : updater);
		},
		[columnsConfig?.order, updateColumnsConfig],
	);

	const onColumnVisibilityChange = useCallback(
		(updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
			const prev = columnsConfig?.visible ?? {};
			const next = typeof updater === "function" ? updater(prev) : updater;
			updateColumnsConfig("visible", forcePersistColumnsVisible(next));
		},
		[columnsConfig?.visible, forcePersistColumnsVisible, updateColumnsConfig],
	);

	const onColumnSizingChange = useCallback(
		(updater: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)) => {
			const prev = columnsConfig?.resized ?? {};
			updateColumnsConfig("resized", typeof updater === "function" ? updater(prev) : updater);
		},
		[columnsConfig?.resized, updateColumnsConfig],
	);

	return {
		columnLabels,
		columnIds,
		columnsConfig,
		getSettingsPayload,
		columnsOrder,
		columnVisible,
		onColumnsOrderChange,
		onColumnVisibilityChange,
		onColumnSizingChange,
		isOptionsPending,
		optionsError,
	};
}

