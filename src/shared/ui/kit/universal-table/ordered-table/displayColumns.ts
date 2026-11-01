import type { Column, ColumnDef } from "@tanstack/react-table";

export const ROW_ACTIONS_COLUMN_VARIANT = "rowActions" as const;

export type RowActionsColumnMeta = {
	variant: typeof ROW_ACTIONS_COLUMN_VARIANT;
};

export function isRowActionsDisplayColumn<TData extends Record<string, unknown>>(
	column: Column<TData, unknown> | ColumnDef<TData, unknown>,
): boolean {
	const meta = "columnDef" in column ? column.columnDef.meta : column.meta;
	return (meta as RowActionsColumnMeta | undefined)?.variant === ROW_ACTIONS_COLUMN_VARIANT;
}

