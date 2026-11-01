import { flexRender, type Cell } from "@tanstack/react-table";
import { getCellSizeStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/cellStyle";
import { getPinningClassName, getPinningStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/pinning";
import tableStyles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";
import styles from "@/shared/ui/kit/universal-table/ordered-table/ActionsColumnCell.module.css";

type ActionsColumnCellProps<TData extends Record<string, unknown>> = {
	cell: Cell<TData, unknown>;
};

export function ActionsColumnCell<TData extends Record<string, unknown>>({
	cell,
}: ActionsColumnCellProps<TData>) {
	const pinClass = getPinningClassName(cell.column);
	return (
		<td
			className={`${tableStyles.cell} ${styles.cell} ${pinClass}`.trim()}
			style={{ ...getCellSizeStyle(cell.column.getSize()), ...getPinningStyle(cell.column) }}>
			{flexRender(cell.column.columnDef.cell, cell.getContext())}
		</td>
	);
}

