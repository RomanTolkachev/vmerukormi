import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsTouchable } from "@/shared/ui/kit/hooks/useIsTouchable";
import { resolveTableResize } from "@/shared/ui/kit/universal-table/lib/resize";
import { TableCards } from "@/shared/ui/kit/universal-table/ui/TableCards";
import { TableFooter } from "@/shared/ui/kit/universal-table/ui/TableFooter";
import { TableDocumentActions } from "@/shared/ui/kit/universal-table/ui/TableDocumentActions";
import { resolveTableSort } from "@/shared/ui/kit/universal-table/lib/sort";
import { DEFAULT_PER_PAGE, normalizeTablePerPage } from "@/shared/ui/kit/universal-table/lib/perPage";
import { Preloader } from "@/shared/ui/kit/preloader/Preloader";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readUniversalTableSavedQuery } from "@/shared/ui/kit/universal-table/table-settings/savedState";
import { TableOptionsQueries } from "@/shared/ui/kit/universal-table/table-settings/table-options-queries";
import { OrderedTable } from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable";
import { resolveRowId } from "@/shared/ui/kit/universal-table/lib/columns";
import { ACTIONS_COLUMN_ID, createActionsDisplayColumn } from "@/shared/ui/kit/universal-table/lib/CreateActionsColumn";
import { createCustomColumns } from "@/shared/ui/kit/universal-table/lib/CreateCustomColumns";
import { useUrlQuery as useUrlParams } from "@/shared/ui/kit/lib/useUrlQuery";
import { TableQueryFormProvider, useTableQuery } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import { TableSelectionProvider } from "@/shared/ui/kit/universal-table/api/TableSelectionProvider";
import { useResponsePageSync } from "@/shared/ui/kit/universal-table/hooks/useResponsePageSync";
import { useTableColumns } from "@/shared/ui/kit/universal-table/hooks/useTableColumns";
import { useTableQueryActions } from "@/shared/ui/kit/universal-table/hooks/useTableQueryActions";
import { useTableRowsQuery } from "@/shared/ui/kit/universal-table/hooks/useTableRowsQuery";
import { TableToolbar } from "@/shared/ui/kit/universal-table/TableToolbar";
import { TableSelectedCount } from "@/shared/ui/kit/universal-table/TableSelectedCount";
import type { TableBaseQuery, UniversalTableActionContext, UniversalTableCustomColumnMeta, UniversalTableListResponse, UniversalTableProps } from "@/shared/ui/kit/universal-table/types";
import { toTableSizeStyle } from "@/shared/ui/kit/universal-table/lib/toTableSizeStyle";
import { resolveTableSizeTokens } from "@/shared/ui/kit/universal-table/lib/tableSizeTokens";
import styles from "@/shared/ui/kit/universal-table/UniversalTable.module.css";

/** Базовые дефолты query — подставляются под `props.defaults` (Partial). */
const BASE_QUERY_DEFAULTS: TableBaseQuery = { page: 1, per_page: DEFAULT_PER_PAGE, search: "" };

/**
 * Универсальная серверная таблица с пагинацией, поиском, сортировкой,
 * пользовательскими настройками колонок и произвольными ячейками действий.
 *
 * Компонент сам формирует query key из `tableName` и текущих параметров,
 * загружает строки через `queryFn` и ожидает пользовательские настройки перед
 * первым рендером. При `shouldFetchUserSettings={false}` сразу использует
 * дефолтную конфигурацию и не обращается к API настроек.
 *
 * Основные пропсы:
 * - `tableName` — уникальное имя таблицы и корень query key;
 * - `queryFn` — загрузчик данных, получающий актуальный `TQuery`;
 * - `queryOptions` — настройки TanStack Query (`select`, `staleTime`, `gcTime`, `retry`);
 * - `defaults` — начальные значения пагинации, поиска, сортировки и фильтров;
 * - `toolbar` — поиск, настройки, левый слот и дополнительные кнопки;
 * - `customColumns` / `actionCell` — прикладные колонки и закреплённая колонка действий;
 * - `sortable` — разрешённые для серверной сортировки колонки;
 * - `rowSelection` — выбор строк и доступ к selection-хукам;
 * - `syncUrlQuery` — сохраняет query таблицы в адресной строке;
 * - `persistColumns` — обязательные колонки, которые нельзя скрыть в настройках;
 * - `resizable` — включает ресайз всех колонок, отключает его или задаёт whitelist;
 * - `columnSizeData`, `compact`, `sizeTokens` — размеры и плотность таблицы.
 *
 * @example
 * ```tsx
 * <UniversalTable<UserRow, UsersQuery, UsersResponse>
 *   tableName="users_registry"
 *   defaults={{ page: 1, per_page: 25, search: "" }}
 *   queryFn={getUsers}
 *   queryOptions={{
 *     staleTime: Infinity,
 *     gcTime: 2 * 60 * 1000,
 *     select: response => response,
 *   }}
 *   sortable={["createdAt"]}
 *   persistColumns={["name"]}
 *   resizable={["name", "createdAt"]}
 *   toolbar={{
 *     search: { enabled: true, name: "search", placeholder: "Поиск" },
	 *     settingsButton: { enabled: true },
 *   }}
 *   actionCell={(ctx, row) => (
 *     <UserActions row={row} onChanged={ctx.invalidateRows} />
 *   )}
 * />
 * ```
 *
 * @typeParam TRow Нормализованная строка, которую получает `OrderedTable`.
 * @typeParam TQuery Состояние параметров списка: пагинация, поиск, сортировка и фильтры.
 * @typeParam TResponse Табличный ответ после `queryOptions.select`: строки, колонки и total.
 * @typeParam TQueryFnData Сырой ответ `queryFn` до преобразования через `select`.
 */
export function UniversalTable<
	TRow extends Record<string, unknown>,
	TQuery extends TableBaseQuery = TableBaseQuery,
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
	TQueryFnData = TResponse,
>(props: UniversalTableProps<TRow, TQuery, TResponse, TQueryFnData>) {
	const {
		shouldFetchUserSettings = true,
		syncUrlQuery,
		compact = false,
		sizeTokens,
	} = props;

	const tableAreaStyle = useMemo(
		() => toTableSizeStyle(resolveTableSizeTokens(compact, sizeTokens)),
		[compact, sizeTokens],
	);

	// Мерджим частичные дефолты страницы поверх базовых. JSON-ключ стабилизирует ссылку,
	// чтобы инлайновый объект `defaults={{...}}` не пересоздавал значение каждый рендер.
	const defaultsKey = JSON.stringify(props.defaults ?? {});
	const defaults = useMemo(
		() => normalizeTablePerPage({ ...BASE_QUERY_DEFAULTS, ...props.defaults } as TQuery),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[defaultsKey],
	);
	const urlParams = useUrlParams<TQuery>({
		enabled: syncUrlQuery?.enabled ?? false,
		normalize: syncUrlQuery?.normalize,
	});

	// `useQuery` шарит кеш с `useTableSettings` внутри Content, лишних запросов нет.
	const settingsQuery = useQuery({
		...TableOptionsQueries.get({ tableName: props.tableName }),
		enabled: shouldFetchUserSettings,
	});
	const quickSearchKey = (props.toolbar?.search?.name ?? "search") as Extract<
		keyof TQuery,
		string
	>;
	const savedQuery = shouldFetchUserSettings
		? readUniversalTableSavedQuery<TQuery>(settingsQuery.data?.query, quickSearchKey)
		: undefined;
	const initialBaseQueryState = useMemo(() => {
		return {
			...defaults,
			...savedQuery,
		} as TQuery;
	}, [defaults, savedQuery]);

	if (shouldFetchUserSettings && settingsQuery.isPending) {
		return (
			<div className={styles.root}>
				<div className={styles.tableArea} style={tableAreaStyle}>
					<Preloader />
				</div>
			</div>
		);
	}

	return (
		<UniversalTableStateful<TRow, TQuery, TResponse, TQueryFnData>
			key={`${props.tableName}:${shouldFetchUserSettings ? "user-settings" : "default-settings"}:${defaultsKey}`}
			{...props}
			shouldFetchUserSettings={shouldFetchUserSettings}
			defaults={defaults}
			initialBaseQueryState={initialBaseQueryState}
			urlQuery={urlParams.query}
			setUrlQuery={urlParams.setQuery}
		/>
	);
}

/** Stateful-часть: владеет committed-query, провайдерами формы и выделения. */
function UniversalTableStateful<
	TRow extends Record<string, unknown>,
	TQuery extends TableBaseQuery,
	TResponse extends UniversalTableListResponse,
	TQueryFnData,
>({
	defaults,
	initialBaseQueryState,
	urlQuery,
	setUrlQuery,
	...props
}: UniversalTableProps<TRow, TQuery, TResponse, TQueryFnData> & {
	defaults: TQuery;
	initialBaseQueryState: TQuery;
	urlQuery: Partial<TQuery>;
	setUrlQuery: (query: TQuery, replace?: boolean) => void;
}) {
	// Снимок настроек фиксируется при монтировании. Обновление query-кеша после
	// ручного сохранения не должно повторно инициализировать текущую таблицу.
	const [baseQueryState] = useState(initialBaseQueryState);
	const [initialQueryState] = useState<TQuery>(() => normalizeTablePerPage({
		...baseQueryState,
		...urlQuery,
	}));
	const [queryState, setQueryState] = useState<TQuery>(initialQueryState);
	const urlQueryKey = JSON.stringify(urlQuery);
	const previousUrlQueryKey = useRef(urlQueryKey);

	useEffect(() => {
		if (previousUrlQueryKey.current === urlQueryKey) return;
		previousUrlQueryKey.current = urlQueryKey;
		// Пресет применяется только при входе. Иначе удалённые из URL условия
		// (в том числе снятая сортировка) возвращаются из сохранённого снимка.
		const next = normalizeTablePerPage({
			...defaults,
			...urlQuery,
			sort_col: urlQuery.sort_col,
			sort_dir: urlQuery.sort_dir,
		} as TQuery);
		setQueryState(current => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
	}, [defaults, urlQuery, urlQueryKey]);

	useEffect(() => {
		setUrlQuery(initialQueryState, true);
	}, [initialQueryState, setUrlQuery]);

	const handleQueryChange = useCallback(
		(nextQuery: TQuery) => {
			setQueryState(nextQuery);
			setUrlQuery(nextQuery, true);
		},
		[setUrlQuery],
	);

	const onQueryChange = props.onQueryChange;
	useEffect(() => {
		onQueryChange?.(queryState);
	}, [onQueryChange, queryState]);

	const inner = (
		<TableQueryFormProvider<TQuery>
			defaults={defaults}
			queryState={queryState}
			onQueryChange={handleQueryChange}>
			<UniversalTableContent<TRow, TQuery, TResponse, TQueryFnData>
				{...props}
				queryState={queryState}
			/>
		</TableQueryFormProvider>
	);

	return props.rowSelection?.enabled ? (
		<TableSelectionProvider
			key={props.rowSelection.maxSelected ?? "unlimited"}
			maxSelected={props.rowSelection.maxSelected}>
			{inner}
		</TableSelectionProvider>
	) : (
		inner
	);
}

function UniversalTableContent<
	TRow extends Record<string, unknown>,
	TQuery extends TableBaseQuery,
	TResponse extends UniversalTableListResponse,
	TQueryFnData,
>({
	queryState,
	tableName,
	queryScopeKey,
	queryFn,
	queryOptions,
	mapRows,
	toolbar,
	excelSlot,
	printSlot,
	wordSlot,
	actionCell,
	actionCellWidth,
	rowSelection,
	formatCellValue,
	customColumns,
	sortable,
	shouldFetchUserSettings = true,
	getRowId = resolveRowId,
	onRowClick,
	excludeColumnsInClear,
	columnSizeData,
	resizable,
	cardsView,
	persistColumns,
	compact = false,
	sizeTokens,
}: UniversalTableProps<TRow, TQuery, TResponse, TQueryFnData> & { queryState: TQuery }) {
	const isTouchable = useIsTouchable();
	const resize = resolveTableResize(resizable, isTouchable);

	const queryClient = useQueryClient();
	const queryForm = useTableQuery<TQuery>();
	const isSelectionEnabled = rowSelection?.enabled === true;
	const rowSelectionGetRowId = rowSelection?.getRowId;
	const toolbarBottomSlot = toolbar?.bottomSlot ?? toolbar?.leftSlot;

	const { page, per_page: perPage } = queryState;
	const pageIndex = Math.max(0, page - 1);

	const { rowsQuery, staticSortable, sortedColumns, tableData } =
		useTableRowsQuery<TRow, TQuery, TResponse, TQueryFnData>({
			tableName,
			queryScopeKey,
			queryState,
			sortable,
			queryFn,
			queryOptions,
			mapRows,
		});

	const getRowIdForTable = useCallback(
		(row: TRow, index: number) => {
			if (rowSelectionGetRowId) {
				return rowSelectionGetRowId(row, index, { columns: sortedColumns });
			}
			return getRowId(row, index);
		},
		[rowSelectionGetRowId, getRowId, sortedColumns],
	);

	const dataColumnIds = useMemo(
		() => sortedColumns.map(column => column.name),
		[sortedColumns],
	);
	const relationColumnIds = useMemo(
		() =>
			new Set(
				sortedColumns
					.filter(column => column.type === "relation")
					.map(column => column.name),
			),
		[sortedColumns],
	);
	const getDataCellValue = useCallback(
		(row: TRow, columnId: string) => {
			if (relationColumnIds.has(columnId)) {
				return row[`${columnId}__label`] ?? row[columnId] ?? null;
			}
			return row[columnId] ?? null;
		},
		[relationColumnIds],
	);

	// Мета (id/label/defaultHidden) стабильна между апдейтами данных — отделяем её от
	// render-функций, чтобы пересборка настроек видимости не зависела от ctx.
	const customColumnsMetaKey = JSON.stringify(
		(customColumns ?? []).map(c => ({
			id: c.id,
			label: c.label ?? (typeof c.header === "string" ? c.header : c.id),
			defaultHidden: c.defaultHidden,
			width: c.width,
		})),
	);
	const customColumnsMeta = useMemo<UniversalTableCustomColumnMeta[]>(
		() => JSON.parse(customColumnsMetaKey),
		[customColumnsMetaKey],
	);

	const {
		columnLabels,
		columnsConfig,
		getSettingsPayload,
		columnsOrder,
		columnVisible,
		onColumnsOrderChange,
		onColumnVisibilityChange,
		onColumnSizingChange,
		isOptionsPending,
		optionsError,
	} = useTableColumns<TRow>({
		tableName,
		sortedColumns,
		hasActions: Boolean(actionCell),
		customColumnsMeta,
		shouldFetchUserSettings,
		persistColumns,
		columnSizeData,
		defaultCard: cardsView?.defaultCard,
		compact,
	});

	const view = cardsView && columnsConfig?.view === "cards" ? "cards" : "table";
	const isCompact = columnsConfig?.compact ?? compact;
	const visibleColumnIds = useMemo(
		() => columnsOrder.filter(id => id !== ACTIONS_COLUMN_ID && id !== "__select" && columnVisible?.[id] !== false),
		[columnsOrder, columnVisible],
	);
	const actionContext = useMemo(
		(): UniversalTableActionContext<TResponse> => ({
			tableName,
			data: rowsQuery.data,
			tableState: { view, isCompact, visibleColumnIds },
			invalidateRows: () => queryClient.invalidateQueries({ queryKey: [tableName] }),
		}),
		[tableName, rowsQuery.data, queryClient, view, isCompact, visibleColumnIds],
	);

	const bottomSlotNode = toolbarBottomSlot?.(actionContext);
	const inlineSlotNode = toolbar?.inlineSlot?.(actionContext);

	const extraButtonsNode = useMemo<ReactNode>(() => {
		const buttons = toolbar?.extraButtons;
		if (!buttons || buttons.length === 0) return null;
		return buttons.map(b => <Fragment key={b.key}>{b.render(actionContext)}</Fragment>);
	}, [toolbar?.extraButtons, actionContext]);

	const actionsColumn = useMemo(
		() =>
			actionCell
				? createActionsDisplayColumn(actionCell, actionContext, actionCellWidth)
				: undefined,
		[actionCell, actionContext, actionCellWidth],
	);

	const customColumnsDefs = useMemo(
		() =>
			customColumns && customColumns.length > 0
				? createCustomColumns<TRow, TResponse>(customColumns, actionContext)
				: undefined,
		[customColumns, actionContext],
	);

	const mergedCustomColumns = useMemo(() => {
		if (!actionsColumn) return customColumnsDefs;
		return customColumnsDefs ? [...customColumnsDefs, actionsColumn] : [actionsColumn];
	}, [actionsColumn, customColumnsDefs]);
	const resolvedSortable = useMemo(
		() => typeof sortable === "function" ? sortable(actionContext) : staticSortable ?? [],
		[sortable, actionContext, staticSortable],
	);
	const { sortCol, sortDir } = resolveTableSort(queryState, resolvedSortable);
	const tableAreaStyle = toTableSizeStyle(resolveTableSizeTokens(isCompact, sizeTokens));
	const { pagination, handlePaginationChange, handlePerPageChange, handleSortChange } =
		useTableQueryActions<TQuery>({
			queryForm,
			sortable: resolvedSortable,
			sortCol,
			sortDir,
			pageIndex,
			perPage,
			canSaveSettings: shouldFetchUserSettings && toolbar?.settingsButton?.enabled === true,
		});

	useResponsePageSync<TQuery>({
		isFetching: rowsQuery.isFetching,
		data: rowsQuery.data,
		queryForm,
		page,
	});

	const isLoading = (rowsQuery.isPending && rowsQuery.data == null) || isOptionsPending;
	const loadError = rowsQuery.error ?? optionsError;
	const columnsReady = !!columnsConfig && (columnsConfig.order ?? []).length > 0;

	const renderTableBody = (): ReactNode => {
		if (isLoading) return <Preloader />;
		if (loadError) {
			return (
				<Typography variant="body3" component="p" color="danger">
					{loadError instanceof Error ? loadError.message : "Ошибка загрузки"}
				</Typography>
			);
		}
		if (rowsQuery.data == null || !columnsReady) return null;
		if (tableData.length === 0) {
			return (
				<Typography variant="body3" component="p" className={styles.emptyMessage}>
					Данные не найдены
				</Typography>
			);
		}
		if (cardsView && view === "cards") {
			return (
				<TableCards
					rows={tableData}
					getRowId={getRowIdForTable}
					render={row => cardsView.render(actionContext, row)}
				/>
			);
		}

		return (
			<OrderedTable<TRow>
				tableData={tableData}
				dataColumnIds={dataColumnIds}
				getDataCellValue={getDataCellValue}
				columnTranslateData={columnLabels as Partial<Record<keyof TRow, string>>}
				formatCellValue={formatCellValue}
				sortableColumns={resolvedSortable}
				sortCol={sortCol}
				sortDir={sortDir}
				onSortChange={handleSortChange}
				customColumns={mergedCustomColumns}
				excludeColumnsInClear={excludeColumnsInClear}
				columnSizeData={columnSizeData}
				resizable={resize.drag}
				columnsOrder={columnsOrder}
				columnPinning={columnsConfig?.pinned}
				onColumnsOrderChange={onColumnsOrderChange}
				columnVisible={columnVisible}
				onColumnVisibilityChange={onColumnVisibilityChange}
				columnSizing={columnsConfig?.resized}
				onColumnSizingChange={onColumnSizingChange}
				getRowId={getRowIdForTable}
				enableRowSelection={isSelectionEnabled}
				onRowClick={onRowClick}
				pagination={pagination}
				onPaginationChange={handlePaginationChange}
				rowCount={rowsQuery.data.total}
			/>
		);
	};

	return (
		<div className={styles.root}>
			<TableToolbar
				config={toolbar ?? {}}
				disabled={isLoading}
				settings={getSettingsPayload()}
				sortableColumns={resolvedSortable}
				cardsAvailable={Boolean(cardsView)}
				resizeColumns={resize.columns}
				inlineSlot={inlineSlotNode}
				bottomSlot={bottomSlotNode}
				extraButtons={<>
					{extraButtonsNode}
					<TableDocumentActions ctx={actionContext} selectionEnabled={isSelectionEnabled} disabled={isLoading}
						excelSlot={excelSlot} printSlot={printSlot} wordSlot={wordSlot} />
				</>}
			/>
			<div className={styles.tableArea} style={tableAreaStyle}>
				{renderTableBody()}
				{!isLoading && !loadError && rowsQuery.data && columnsReady && <TableFooter
					pageIndex={pageIndex}
					perPage={perPage}
					total={rowsQuery.data.total}
					onPageChange={next => handlePaginationChange({...pagination, pageIndex: next})}
					onPerPageChange={handlePerPageChange}
					counter={isSelectionEnabled ? <TableSelectedCount render={rowSelection?.selectedCount?.render} /> : undefined}
				/>}
			</div>
		</div>
	);
}

