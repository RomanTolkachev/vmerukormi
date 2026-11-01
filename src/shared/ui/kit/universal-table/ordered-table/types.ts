import type {
	ColumnDef,
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	OnChangeFn,
	PaginationState,
	VisibilityState,
} from "@tanstack/react-table";
import type React from "react";

export interface OrderedTableProps<TData extends Record<string, unknown>> {
	tableData: TData[];
	/** Явный список обычных колонок данных. Ключи строк сами колонки не создают. */
	dataColumnIds: readonly string[];
	/** Возвращает отображаемое значение обычной колонки, не изменяя `row.original`. */
	getDataCellValue?: (row: TData, columnId: string) => unknown;
	columnTranslateData?: Partial<Record<keyof TData, string>>;
	/**
	 * Стартовые ширины колонок (px). У `UniversalTable` — проп `columnSizeData`.
	 */
	columnSizeData?: Partial<Record<Extract<keyof TData, string>, number>>;
	excludeColumnsInClear?: (keyof TData)[];
	formatCellValue?: (columnId: string, value: unknown) => React.ReactNode;
	sortableColumns?: readonly string[];
	sortCol?: string;
	sortDir?: "asc" | "desc";
	onSortChange?: (columnId: string) => void;
	customColumns?: ColumnDef<TData>[];
	columnSizing?: ColumnSizingState;
	onColumnSizingChange?: React.Dispatch<React.SetStateAction<ColumnSizingState>>;
	/**
	 * Управляет ручным ресайзом колонок.
	 *
	 * - `true` — можно изменять размер всех колонок, кроме тех, которые сами запрещают ресайз;
	 * - `false` — ручной ресайз полностью выключен;
	 * - массив id — ресайз разрешён только перечисленным колонкам.
	 *
	 * Состояние `columnSizing` продолжает применяться и для запрещённых колонок.
	 *
	 * @default true
	 */
	resizable?: boolean | readonly string[];
	columnVisible?: VisibilityState;
	onColumnVisibilityChange?: React.Dispatch<React.SetStateAction<VisibilityState>>;
	onRowClick?: React.MouseEventHandler<HTMLTableRowElement>;
	columnsOrder: ColumnOrderState;
	/** Обычные колонки; выбор строк и действия закрепляются дополнительно на своих краях. */
	columnPinning?: ColumnPinningState;
	onColumnsOrderChange: React.Dispatch<React.SetStateAction<ColumnOrderState>>;
	/**
	 * Включает колонку-чекбокс слева. Состояние выделения берётся через хуки
	 * `useTableSelection` / `useIsRowSelected` / `useSelectionStats` — OrderedTable
	 * сам не управляет selection (uncontrolled на стороне tanstack table).
	 */
	enableRowSelection?: boolean;
	getRowId?: (row: TData, index: number) => string;
}

export type PaginateableTableProps =
	| { pagination?: undefined; onPaginationChange?: undefined; rowCount?: undefined; perPage?: undefined; onPerPageChange?: undefined }
	| {
			pagination: PaginationState;
			onPaginationChange: OnChangeFn<PaginationState>;
			rowCount: number;
			perPage?: number;
			onPerPageChange?: (value: number) => void;
	  };

