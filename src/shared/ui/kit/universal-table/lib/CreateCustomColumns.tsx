import type { ColumnDef } from "@tanstack/react-table";
import type { UniversalTableActionContext, UniversalTableCustomColumn, UniversalTableListResponse } from "@/shared/ui/kit/universal-table/types";

/**
 * Конвертирует декларативные кастомные колонки в `ColumnDef[]`, прокидывая `ctx`.
 * Колонки ведут себя как обычные колонки данных: участвуют в DnD, ресайзе и
 * настройках видимости (но без серверной сортировки — их нет в whitelist `sortable`).
 */
export function createCustomColumns<
	TRow extends Record<string, unknown>,
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
>(
	customColumns: UniversalTableCustomColumn<TRow, TResponse>[],
	ctx: UniversalTableActionContext<TResponse>,
): ColumnDef<TRow>[] {
	return customColumns.map(col => ({
		id: col.id,
		size: col.width,
		enableSorting: false,
		header: () => col.header ?? null,
		cell: ({ row }) => col.render(ctx, row.original),
	}));
}

