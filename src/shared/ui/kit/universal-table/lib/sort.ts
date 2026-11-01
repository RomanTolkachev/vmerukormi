export type TableSortState = {
	sort_col?: string;
	sort_dir?: "asc" | "desc";
};

export function resolveTableSort(
	query: TableSortState,
	sortable?: readonly string[],
): { sortCol?: string; sortDir?: "asc" | "desc" } {
	if (!sortable?.length) return {};

	const raw = query.sort_col?.trim();
	if (!raw || !sortable.includes(raw)) return {};

	return {
		sortCol: raw,
		sortDir: query.sort_dir === "desc" ? "desc" : "asc",
	};
}

/** Нормализует sort_col/sort_dir по whitelist перед fetch и queryKey. */
export function applySortToQuery<T extends TableSortState>(query: T, sortable?: readonly string[]): T {
	const { sortCol, sortDir } = resolveTableSort(query, sortable);
	if (!sortCol) {
		const next = { ...query };
		delete next.sort_col;
		delete next.sort_dir;
		return next;
	}
	return { ...query, sort_col: sortCol, sort_dir: sortDir };
}

