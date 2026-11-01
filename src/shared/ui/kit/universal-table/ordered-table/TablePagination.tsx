import type { Table } from "@tanstack/react-table";
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { ChevronLeftIcon } from "@/shared/ui/kit/Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "@/shared/ui/kit/Icons/ChevronRightIcon";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import styles from "@/shared/ui/kit/universal-table/ordered-table/TablePagination.module.css";

function DoubleChevronLeftIcon() {
	return (
		<span className={styles.doubleChevron} aria-hidden>
			<ChevronLeftIcon />
			<ChevronLeftIcon />
		</span>
	);
}

function DoubleChevronRightIcon() {
	return (
		<span className={styles.doubleChevron} aria-hidden>
			<ChevronRightIcon />
			<ChevronRightIcon />
		</span>
	);
}

type TablePaginationProps<TData> = {
	table: Table<TData>;
};

export function TablePagination<TData>({ table }: TablePaginationProps<TData>) {
 return <TablePaginationControls pageIndex={table.getState().pagination.pageIndex} pageCount={table.getPageCount()} onPageChange={page => table.setPageIndex(page)} />;
}

export function TablePaginationControls({pageIndex, pageCount, onPageChange}: {pageIndex: number; pageCount: number; onPageChange: (page: number) => void}) {
 const canPrevious = pageIndex > 0;
 const canNext = pageIndex + 1 < pageCount;
 const currentPage = pageCount === 0 ? 0 : pageIndex + 1;

	return (
		<div className={styles.pagination}>
			<IconButton
				variant="ghost"
				icon={<DoubleChevronLeftIcon />}
				disabled={!canPrevious}
				onClick={() => onPageChange(0)}
				aria-label="На первую страницу"
				size="md"
				touchEffect
				wrapperClassName={styles.iconButton}
			/>
			<IconButton
				variant="ghost"
				icon={<ChevronLeftIcon />}
				disabled={!canPrevious}
				onClick={() => onPageChange(pageIndex - 1)}
				aria-label="На предыдущую страницу"
				size="md"
				touchEffect
				wrapperClassName={styles.iconButton}
			/>
			<Typography
				variant="body3"
				component="span"
				className={styles.label}
				aria-label={`Страница ${currentPage} из ${pageCount}`}>
				<span className={styles.labelFull}>Страница {currentPage} из {pageCount}</span>
				<span className={styles.labelCompact}>{currentPage} из {pageCount}</span>
			</Typography>
			<IconButton
				variant="ghost"
				icon={<ChevronRightIcon />}
				disabled={!canNext}
				onClick={() => onPageChange(pageIndex + 1)}
				aria-label="На следующую страницу"
				size="md"
				touchEffect
				wrapperClassName={styles.iconButton}
			/>
			<IconButton
				variant="ghost"
				icon={<DoubleChevronRightIcon />}
				disabled={!canNext}
				onClick={() => onPageChange(Math.max(0, pageCount - 1))}
				aria-label="На последнюю страницу"
				size="md"
				touchEffect
				wrapperClassName={styles.iconButton}
			/>
		</div>
	);
}

