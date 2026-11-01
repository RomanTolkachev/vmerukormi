import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ROW_ACTIONS_COLUMN_VARIANT } from "@/shared/ui/kit/universal-table/ordered-table/displayColumns";
import type { UniversalTableActionCellWidth, UniversalTableActionContext, UniversalTableListResponse } from "@/shared/ui/kit/universal-table/types";
import { resolveActionsColumnWidth } from "@/shared/ui/kit/universal-table/lib/tableSizeTokens";

export const ACTIONS_COLUMN_ID = "__actions";

export function createActionsDisplayColumn<
	TRow extends Record<string, unknown>,
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
>(
	actionCell: (ctx: UniversalTableActionContext<TResponse>, row: TRow) => ReactNode,
	ctx: UniversalTableActionContext<TResponse>,
	width?: UniversalTableActionCellWidth,
): ColumnDef<TRow> {
	return {
		id: ACTIONS_COLUMN_ID,
		size: resolveActionsColumnWidth(width, ctx.tableState.isCompact),
		enableSorting: false,
		enableResizing: false,
		enableHiding: false,
		meta: { variant: ROW_ACTIONS_COLUMN_VARIANT },
		header: "Действия",
		cell: ({ row }) => actionCell(ctx, row.original),
	};
}

