import { flexRender, type Cell } from "@tanstack/react-table";
import { getCellSizeStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/cellStyle";
import { getPinningClassName, getPinningStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/pinning";
import tableStyles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";
import styles from "@/shared/ui/kit/universal-table/ordered-table/TableCell.module.css";

type TableCellProps<TData extends Record<string, unknown>> = {
	cell: Cell<TData, unknown>;
};

export function TableCell<TData extends Record<string, unknown>>({ cell }: TableCellProps<TData>) {

	const style = {
		...getCellSizeStyle(cell.column.getSize()),
		...getPinningStyle(cell.column),
	};

	return (
		<td
			className={`${tableStyles.cell} ${styles.cell} ${getPinningClassName(cell.column)}`.trim()}
			style={style}>
			{flexRender(cell.column.columnDef.cell, cell.getContext())}
		</td>
	);
}

