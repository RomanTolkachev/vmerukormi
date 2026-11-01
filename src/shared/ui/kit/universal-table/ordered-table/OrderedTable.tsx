import React from "react";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { createRowSelectionDisplayColumn, isRowSelectionDisplayColumn, SELECT_COLUMN_ID } from "@/shared/ui/kit/universal-table/ordered-table/rowSelection";
import { ActionsColumnCell } from "@/shared/ui/kit/universal-table/ordered-table/ActionsColumnCell";
import { ActionsColumnHeader } from "@/shared/ui/kit/universal-table/ordered-table/ActionsColumnHeader";
import { isRowActionsDisplayColumn } from "@/shared/ui/kit/universal-table/ordered-table/displayColumns";
import { getCellSizeStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/cellStyle";
import { getPinningClassName, getPinningStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/pinning";
import { normalizeColumnPinning } from "@/shared/ui/kit/universal-table/lib/columnPinning";
import { SelectionColumnCell } from "@/shared/ui/kit/universal-table/ordered-table/SelectionColumnCell";
import { SelectionColumnHeader } from "@/shared/ui/kit/universal-table/ordered-table/SelectionColumnHeader";
import { TableCell } from "@/shared/ui/kit/universal-table/ordered-table/TableCell";
import { TableHeader } from "@/shared/ui/kit/universal-table/ordered-table/TableHeader";
import type { OrderedTableProps, PaginateableTableProps } from "@/shared/ui/kit/universal-table/ordered-table/types";
import styles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";

export type { OrderedTableProps, PaginateableTableProps } from "@/shared/ui/kit/universal-table/ordered-table/types";

function OrderedTableInner<TData extends Record<string, unknown>>({
	tableData,
	dataColumnIds,
	getDataCellValue,
	columnTranslateData,
	columnSizeData,
	excludeColumnsInClear,
	formatCellValue,
	sortableColumns,
	sortCol,
	sortDir,
	onSortChange,
	customColumns,
	onRowClick,
	columnSizing,
	onColumnSizingChange,
	resizable = true,
	columnVisible,
	onColumnVisibilityChange,
	columnsOrder,
	columnPinning: userPinning,
	enableRowSelection = false,
	getRowId,
	pagination,
	onPaginationChange,
	rowCount,
}: OrderedTableProps<TData> & PaginateableTableProps) {
	const isRowSelectionEnabled = enableRowSelection;

	type Columns = Extract<keyof TData, string>;

	const selectionColumn = React.useMemo(
		() => createRowSelectionDisplayColumn<TData>(),
		[],
	);

	const columns = React.useMemo<ColumnDef<TData>[]>(() => {
		const availableColumnIds = dataColumnIds as Columns[];
		if (availableColumnIds.length === 0) {
			return isRowSelectionEnabled ? [selectionColumn] : [];
		}

		const dataKeys = new Set(availableColumnIds);
		let columnsKeys = columnsOrder.filter(
			(id): id is Columns => id !== SELECT_COLUMN_ID && dataKeys.has(id as Columns),
		);

		if (columnsKeys.length === 0) {
			columnsKeys = availableColumnIds;
		}

		if (excludeColumnsInClear !== undefined) {
			columnsKeys = columnsKeys.filter(column => !excludeColumnsInClear.includes(column));
		}

		const canResizeColumn = (columnId: string) =>
			resizable === true || (Array.isArray(resizable) && resizable.includes(columnId));

		const clearColumns = columnsKeys.map<ColumnDef<TData>>(column => ({
			accessorFn: row =>
				getDataCellValue ? getDataCellValue(row, column) : row[column],
			id: column,
			header: columnTranslateData?.[column] ?? column,
			enableSorting: false,
			enableResizing: canResizeColumn(column),
			size: columnSizeData?.[column],
			cell: ({ getValue }) => {
				const value = getValue();
				if (formatCellValue) return formatCellValue(column, value);
				if (value == null || value === "") return "—";
				return String(value);
			},
		}));

		const resolvedCustomColumns = customColumns?.map(column => ({
			...column,
			enableResizing:
				column.enableResizing !== false && canResizeColumn(String(column.id ?? "")),
		}));

		const dataColumns =
			resolvedCustomColumns === undefined
				? clearColumns
				: [...clearColumns, ...resolvedCustomColumns];

		return isRowSelectionEnabled ? [selectionColumn, ...dataColumns] : dataColumns;
	}, [
		dataColumnIds,
		getDataCellValue,
		columnTranslateData,
		columnSizeData,
		resizable,
		excludeColumnsInClear,
		formatCellValue,
		customColumns,
		columnsOrder,
		isRowSelectionEnabled,
		selectionColumn,
	]);

	const tableColumnOrder = React.useMemo(
		() =>
			isRowSelectionEnabled
				? [SELECT_COLUMN_ID, ...columnsOrder.filter(id => id !== SELECT_COLUMN_ID)]
				: columnsOrder,
		[isRowSelectionEnabled, columnsOrder],
	);

	const columnPinning = React.useMemo(() => {
		const actions = columns
			.filter(c => isRowActionsDisplayColumn(c) && typeof c.id === "string")
			.map(c => c.id as string);
		const dataOrder = tableColumnOrder.filter(id => id !== SELECT_COLUMN_ID && !actions.includes(id));
		const pinned = normalizeColumnPinning(userPinning, dataOrder, columnVisible);
		return {
			left: [...(isRowSelectionEnabled ? [SELECT_COLUMN_ID] : []), ...pinned.left],
			right: [...pinned.right, ...actions],
		};
	}, [columns, isRowSelectionEnabled, tableColumnOrder, userPinning, columnVisible]);

	const resolveRowId = React.useCallback(
		(row: TData, index: number) => (getRowId ? getRowId(row, index) : String(index)),
		[getRowId],
	);

	const table = useReactTable({
		data: tableData,
		columns,
		defaultColumn: {
			minSize: 80,
			size: 150,
		},
		state: {
			columnSizing: columnSizing,
			columnVisibility: columnVisible,
			columnOrder: tableColumnOrder,
			pagination: pagination,
			columnPinning,
		},
		enableColumnPinning: true,
		getRowId: resolveRowId,
		getCoreRowModel: getCoreRowModel(),
		columnResizeMode: "onChange",
		enableColumnResizing: resizable !== false,
		onColumnSizingChange: onColumnSizingChange,
		onColumnVisibilityChange: onColumnVisibilityChange,
		manualPagination: pagination !== undefined ? true : undefined,
		onPaginationChange: onPaginationChange,
		rowCount: rowCount,
	});
	const rightColumns = table.getRightVisibleLeafColumns();
	const firstRightColumnId = rightColumns[0]?.id;
	const visibleColumns = [
		...table.getLeftVisibleLeafColumns(),
		...table.getCenterVisibleLeafColumns(),
		...rightColumns,
	];
	const tableStyle = { minWidth: table.getTotalSize() };

	const headerXRef = React.useRef<HTMLDivElement>(null);
	const bodyXRef = React.useRef<HTMLDivElement>(null);
	const isSyncing = React.useRef(false);
	const [scrollbarGutter, setScrollbarGutter] = React.useState(0);

	// Vertical scrollbar body уменьшает его scrollport. Header такого скроллбара не имеет,
	// поэтому без компенсации thead/tbody разъезжаются по X (особенно pinned-right колонка).
	// Меряем фактическую ширину скроллбара body (offsetWidth - clientWidth): 0 для overlay
	// (macOS) — заглушки нет и сдвига нет; ширина скроллбара для классических (Windows/Linux).
	// paddingRight на scroll-контейнере не клипает контент при горизонтальном скролле,
	// поэтому выделяем gutter отдельным блоком справа от header.
	React.useLayoutEffect(() => {
		const body = bodyXRef.current;
		if (!body) return;

		const apply = () => {
			setScrollbarGutter(body.offsetWidth - body.clientWidth);
		};

		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(body);
		return () => observer.disconnect();
	}, []);

	const syncScroll =
		(source: "header" | "body") =>
		({ currentTarget: { scrollLeft } }: React.UIEvent<HTMLDivElement>) => {
			if (isSyncing.current) return;
			isSyncing.current = true;

			if (source === "header" && bodyXRef.current) {
				bodyXRef.current.scrollLeft = scrollLeft;
			} else if (source === "body" && headerXRef.current) {
				headerXRef.current.scrollLeft = scrollLeft;
			}

			requestAnimationFrame(() => {
				isSyncing.current = false;
			});
		};

	return (
		<>
			<div className={styles.outer}>
				<div className={styles.headerWrapper}>
					<div
						className={styles.headerXScroll}
						ref={headerXRef}
						onScroll={syncScroll("header")}>
						<table
							className={styles.table}
							style={tableStyle}>
							<thead className={styles.header}>
								{table.getHeaderGroups().map(hg => (
									<tr key={hg.id} className={styles.row}>
										{hg.headers.map(header => (
											<React.Fragment key={header.id}>
												{header.column.id === firstRightColumnId ? (
													<th className={styles.widthSpacer} aria-hidden />
												) : null}
												{isRowSelectionDisplayColumn(header.column.id) ? (
													<SelectionColumnHeader header={header} />
												) : isRowActionsDisplayColumn(header.column) ? (
													<ActionsColumnHeader header={header} />
												) : (
													<TableHeader
														header={header}
														sortableColumns={sortableColumns}
														sortCol={sortCol}
														sortDir={sortDir}
														onSortChange={onSortChange}
													/>
												)}
											</React.Fragment>
										))}
										{firstRightColumnId === undefined ? (
											<th className={styles.widthSpacer} aria-hidden />
										) : null}
									</tr>
								))}
							</thead>
						</table>
					</div>
					{scrollbarGutter > 0 ? (
						<div
							className={styles.headerGutter}
							style={{ width: scrollbarGutter }}
							aria-hidden
						/>
					) : null}
				</div>

				<div className={styles.bodyWrapper}>
					<div
						className={styles.bodyXScroll}
						ref={bodyXRef}
						onScroll={syncScroll("body")}>
						<table
							className={styles.table}
							style={tableStyle}>
							<tbody className={styles.body}>
								{table.getRowModel().rows.map(row => (
									<tr key={row.id} className={styles.row} onClick={onRowClick}>
										{row.getVisibleCells().map(cell => (
											<React.Fragment key={cell.id}>
												{cell.column.id === firstRightColumnId ? (
													<td className={styles.widthSpacer} aria-hidden />
												) : null}
												{isRowSelectionDisplayColumn(cell.column.id) ? (
													<SelectionColumnCell cell={cell} />
												) : isRowActionsDisplayColumn(cell.column) ? (
													<ActionsColumnCell cell={cell} />
												) : (
													<TableCell cell={cell} />
												)}
											</React.Fragment>
										))}
										{firstRightColumnId === undefined ? (
											<td className={styles.widthSpacer} aria-hidden />
										) : null}
									</tr>
								))}
								<tr className={`${styles.row} ${styles.fillerRow}`.trim()} aria-hidden>
									{visibleColumns.map(col => {
										const pinClass = getPinningClassName(col);
										return (
											<React.Fragment key={col.id}>
												{col.id === firstRightColumnId ? (
													<td className={styles.widthSpacer} aria-hidden />
												) : null}
												<td
													className={`${styles.fillerCell} ${pinClass}`.trim()}
													style={{ ...getCellSizeStyle(col.getSize()), ...getPinningStyle(col) }}
												/>
											</React.Fragment>
										);
									})}
									{firstRightColumnId === undefined ? (
										<td className={styles.widthSpacer} aria-hidden />
									) : null}
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</>
	);
}

// memo сохраняет дженерик-сигнатуру через cast — отсекает ре-рендеры на «лишних»
// апдейтах родителя (например, переключение isFetching при keepPreviousData).
export const OrderedTable = React.memo(OrderedTableInner) as typeof OrderedTableInner;

