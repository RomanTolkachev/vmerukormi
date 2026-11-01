import type { UniversalTableActionCellWidth, UniversalTableSizeTokens } from "@/shared/ui/kit/universal-table/types";

/** Значения по умолчанию для `compact={true}` (только зона таблицы, не toolbar). */
export const UNIVERSAL_TABLE_COMPACT_TOKENS: UniversalTableSizeTokens = {
	textXs: "var(--typography-body3-font-size)",
	textXsLineHeight: "var(--typography-body3-line-height)",
	spacing1: "2px",
	spacing2: "4px",
	spacing4: "8px",
	spacing8: "12px",
};

export function resolveTableSizeTokens(
	compact: boolean,
	sizeTokens?: UniversalTableSizeTokens,
): UniversalTableSizeTokens {
	const base = compact ? UNIVERSAL_TABLE_COMPACT_TOKENS : {
		textXs: "var(--typography-body2-font-size)",
		textXsLineHeight: "var(--typography-body2-line-height)",
	};
	return { ...base, ...sizeTokens };
}

export function resolveActionsColumnWidth(width: UniversalTableActionCellWidth = 120, compact: boolean): number {
	return typeof width === "number" ? width : width[compact ? "compact" : "normal"];
}

