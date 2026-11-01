import { flexRender, type Header } from "@tanstack/react-table";
import { getCellSizeStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/cellStyle";
import { getPinningClassName, getPinningStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/pinning";
import tableStyles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";
import styles from "@/shared/ui/kit/universal-table/ordered-table/SelectionColumnHeader.module.css";

type SelectionColumnHeaderProps<TData extends Record<string, unknown>> = {
	header: Header<TData, unknown>;
};

export function SelectionColumnHeader<TData extends Record<string, unknown>>({
	header,
}: SelectionColumnHeaderProps<TData>) {
	const pinClass = getPinningClassName(header.column);
	return (
		<th
			colSpan={header.colSpan}
			className={`${tableStyles.cell} ${styles.header} ${pinClass}`.trim()}
			style={{ ...getCellSizeStyle(header.column.getSize()), ...getPinningStyle(header.column) }}>
			{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
		</th>
	);
}

