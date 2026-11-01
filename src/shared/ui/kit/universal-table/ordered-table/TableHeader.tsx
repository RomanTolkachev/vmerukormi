import { flexRender, type Header } from "@tanstack/react-table";
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { ChevronDownIcon } from "@/shared/ui/kit/Icons/ChevronDownIcon";
import { ChevronUpIcon } from "@/shared/ui/kit/Icons/ChevronUpIcon";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { getCellSizeStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/cellStyle";
import { getPinningClassName, getPinningStyle } from "@/shared/ui/kit/universal-table/ordered-table/lib/pinning";
import tableStyles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";
import styles from "@/shared/ui/kit/universal-table/ordered-table/TableHeader.module.css";

type TableHeaderProps<TData extends Record<string, unknown>> = {
	header: Header<TData, unknown>;
	sortableColumns?: readonly string[];
	sortCol?: string;
	sortDir?: "asc" | "desc";
	onSortChange?: (columnId: string) => void;
};

function stopPointerEvent(e: React.SyntheticEvent) {
	e.stopPropagation();
}

export function TableHeader<TData extends Record<string, unknown>>({
	header,
	sortableColumns,
	sortCol,
	sortDir,
	onSortChange,
}: TableHeaderProps<TData>) {

	const style = {
		...getCellSizeStyle(header.column.getSize()),
		...getPinningStyle(header.column),
	};

	const columnId = header.column.id;
	const isSortable = sortableColumns?.includes(columnId) ?? false;
	const isActiveSort = sortCol === columnId;
	const isAscActive = isActiveSort && sortDir === "asc";
	const isDescActive = isActiveSort && sortDir === "desc";

	return (
		<th
			colSpan={header.colSpan}
			className={`${tableStyles.cell} ${styles.header} ${getPinningClassName(header.column)}`.trim()}
			style={style}>
			{header.isPlaceholder ? null : (
				<div
					className={`${styles.headerContent} ${isSortable ? styles.headerContentSortable : ""}`.trim()}>
					<div className={styles.headerLabel}>
						<Typography variant="header4" color="normal" component="span" className={tableStyles.headerText}>
							{flexRender(header.column.columnDef.header, header.getContext())}
						</Typography>
					</div>
					{isSortable ? (
						<IconButton
							style={{ zIndex: 1 }}
							type="button"
							variant="ghost"
							size="sm"
							aria-label={`Сортировка по колонке ${String(header.column.columnDef.header ?? columnId)}`}
							wrapperClassName={styles.sortButton}
							onPointerDown={stopPointerEvent}
							onMouseDown={stopPointerEvent}
							onTouchStart={stopPointerEvent}
							onClick={e => {
								e.stopPropagation();
								onSortChange?.(columnId);
							}}>
							<span className={styles.sortIndicators} aria-hidden>
								<ChevronUpIcon
									className={`${styles.sortArrow} ${isAscActive ? styles.sortArrowActive : styles.sortArrowMuted}`}
								/>
								<ChevronDownIcon
									className={`${styles.sortArrow} ${isDescActive ? styles.sortArrowActive : styles.sortArrowMuted}`}
								/>
							</span>
						</IconButton>
					) : null}
				</div>
			)}
			{header.column.getCanResize() ? (
				<div
					className={styles.resizeHandle}
					onDoubleClick={() => header.column.resetSize()}
					onMouseDown={e => {
						e.stopPropagation();
						header.getResizeHandler()(e);
					}}
					onTouchStart={e => {
						e.stopPropagation();
						header.getResizeHandler()(e);
					}}
				/>
			) : null}
		</th>
	);
}

