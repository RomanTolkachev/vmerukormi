import type { CSSProperties } from "react";
import type { Column } from "@tanstack/react-table";
import styles from "@/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css";

/**
 * Возвращает inline-стили для закреплённой колонки.
 * Использует tanstack `column.getStart('left')` / `getAfter('right')`,
 * которые сами учитывают offset соседних pinned-колонок.
 */
export function getPinningStyle<TData extends Record<string, unknown>>(
	column: Column<TData, unknown>,
): CSSProperties {
	const pinned = column.getIsPinned();
	if (!pinned) return {};

	return {
		position: "sticky",
		left: pinned === "left" ? `${column.getStart("left")}px` : undefined,
		right: pinned === "right" ? `${column.getAfter("right")}px` : undefined,
	};
}

/** Классы для оформления pinned-ячейки (фон, blur, тень). */
export function getPinningClassName<TData extends Record<string, unknown>>(
	column: Column<TData, unknown>,
): string {
	const pinned = column.getIsPinned();
	if (!pinned) return "";
	return pinned === "left"
		? `${styles.pinned} ${styles.pinnedLeft}`
		: `${styles.pinned} ${styles.pinnedRight}`;
}

