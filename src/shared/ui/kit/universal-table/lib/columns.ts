import type { VisibilityState } from "@tanstack/react-table";
import type { IColumnsConfig } from "@/shared/ui/kit/universal-table/table-settings/types";
import type { UniversalTableColumnMeta } from "@/shared/ui/kit/universal-table/types";

type UniversalTableRow = Record<string, unknown>;

export function sortColumns(columns: UniversalTableColumnMeta[] | undefined): UniversalTableColumnMeta[] {
	if (!columns) return [];
	return [...columns].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function buildColumnLabels(columns: UniversalTableColumnMeta[]): Record<string, string> {
	return Object.fromEntries(columns.map(col => [col.name, col.label]));
}

export function buildColumnsConfigFromMeta(columns: UniversalTableColumnMeta[]): IColumnsConfig {
	const sorted = sortColumns(columns);
	const visible: VisibilityState = {};

	for (const column of sorted) {
		if (column.visible === false) visible[column.name] = false;
	}

	return {
		order: sorted.map(column => column.name),
		visible,
		resized: {},
	};
}

export function resolveRowId(row: UniversalTableRow, index: number): string {
	if (row.id != null) return String(row.id);

	const firstValue = Object.values(row).find(value => value != null && value !== "");
	return firstValue != null ? String(firstValue) : String(index);
}

