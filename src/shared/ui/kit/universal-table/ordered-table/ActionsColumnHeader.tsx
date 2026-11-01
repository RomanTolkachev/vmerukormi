import { flexRender, type Header } from "@tanstack/react-table";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { getCellSizeStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/cellStyle";
import { getPinningClassName, getPinningStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/pinning";
import tableStyles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";
import styles from "@/shared/ui/kit/universal-table/ordered-table/ActionsColumnCell.module.css";
import headerStyles from "@/shared/ui/kit/universal-table/ordered-table/TableHeader.module.css";

type ActionsColumnHeaderProps<TData extends Record<string, unknown>> = {
	header: Header<TData, unknown>;
};

export function ActionsColumnHeader<TData extends Record<string, unknown>>({
	header,
}: ActionsColumnHeaderProps<TData>) {
	const pinClass = getPinningClassName(header.column);
	return (
		<th
			colSpan={header.colSpan}
			className={`${tableStyles.cell} ${styles.cell} ${headerStyles.header} ${pinClass}`.trim()}
			style={{ ...getCellSizeStyle(header.column.getSize()), ...getPinningStyle(header.column) }}>
			{header.isPlaceholder ? null : (
				<div className={headerStyles.headerContent}>
					<div className={headerStyles.headerLabel}>
						<Typography variant="header4" color="normal" component="span" className={tableStyles.headerText}>
							{flexRender(header.column.columnDef.header, header.getContext())}
						</Typography>
					</div>
				</div>
			)}
		</th>
	);
}

