import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Checkbox } from "@/shared/ui/kit/inputs/Checkbox";
import { useIsRowSelected, useIsRowSelectionDisabled, useSelectionLimit, useSelectionStats, useTableSelection } from "@/shared/ui/kit/universal-table/api/TableSelectionProvider";

export const SELECT_COLUMN_ID = "__select";

/**
 * Display-колонка с чекбоксом. Header и cell сами подписаны на selection-store —
 * OrderedTable и tanstack table в этих изменениях не участвуют.
 */
export function createRowSelectionDisplayColumn<TData extends Record<string, unknown>>(): ColumnDef<
	TData,
	unknown
> {
	const columnHelper = createColumnHelper<TData>();

	return columnHelper.display({
		id: SELECT_COLUMN_ID,
		size: 48,
		minSize: 48,
		maxSize: 48,
		enableSorting: false,
		enableResizing: false,
		enableHiding: false,
		meta: { variant: "rowSelection" },
		header: ({ table }) => <SelectionHeader rowIds={table.getRowModel().rows.map(r => r.id)} />,
		cell: ({ row }) => <RowCheckbox id={row.id} />,
	});
}

export function SelectionHeader({ rowIds }: { rowIds: string[] }) {
	const maxSelected = useSelectionLimit();

	if (maxSelected !== undefined) return null;
	return <SelectAllCheckbox rowIds={rowIds} />;
}

function SelectAllCheckbox({ rowIds }: { rowIds: string[] }) {
	const stats = useSelectionStats(rowIds);
	const { setSelected, clear } = useTableSelection();
	const visibleIds = useMemo(() => rowIds, [rowIds]);

	return (
		<Checkbox
			size="sm"
			aria-label="Выбрать все строки"
			checked={stats.all}
			onChange={() => {
				if (stats.all) clear();
				else setSelected(visibleIds);
			}}
			onClick={e => e.stopPropagation()}
		/>
	);
}

export function RowCheckbox({ id }: { id: string }) {
	const isSelected = useIsRowSelected(id);
	const isDisabled = useIsRowSelectionDisabled(id);
	const { toggle } = useTableSelection();

	return (
		<Checkbox
			size="sm"
			aria-label="Выбрать строку"
			checked={isSelected}
			disabled={isDisabled}
			onChange={() => toggle(id)}
			onClick={e => e.stopPropagation()}
		/>
	);
}

export function isRowSelectionDisplayColumn(columnId: string) {
	return columnId === SELECT_COLUMN_ID;
}

