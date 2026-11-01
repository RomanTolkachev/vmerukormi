import { useCallback, useMemo } from "react";
import type { OnChangeFn, PaginationState } from "@tanstack/react-table";
import type { TableQueryForm } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";
import { showTableSettingsReminder } from "@/shared/ui/kit/universal-table/ui/TableSettingsReminder";

type UseTableQueryActionsParams<TQuery extends TableBaseQuery> = {
	queryForm: TableQueryForm<TQuery>;
	sortable?: readonly string[];
	sortCol?: string;
	sortDir?: "asc" | "desc";
	pageIndex: number;
	perPage: number;
	canSaveSettings: boolean;
};

/**
 * Хендлеры, меняющие committed-query через форму: пагинация, per_page и сортировка
 * (цикл asc → desc → сброс). `pagination` мемоизирован — стабильная ссылка для OrderedTable.
 */
export function useTableQueryActions<TQuery extends TableBaseQuery>({
	queryForm,
	sortable,
	sortCol,
	sortDir,
	pageIndex,
	perPage,
	canSaveSettings,
}: UseTableQueryActionsParams<TQuery>) {
	const pagination = useMemo<PaginationState>(
		() => ({ pageIndex, pageSize: perPage }),
		[pageIndex, perPage],
	);

	const handlePaginationChange = useCallback<OnChangeFn<PaginationState>>(
		updater => {
			const next = typeof updater === "function" ? updater({ pageIndex, pageSize: perPage }) : updater;
			queryForm.setBase("page", next.pageIndex + 1, { shouldDirty: true });
			queryForm.setBase("per_page", next.pageSize, { shouldDirty: true });
			queryForm.submit({ resetPage: false });
			if (canSaveSettings && next.pageSize !== perPage) showTableSettingsReminder('perPage');
		},
		[pageIndex, perPage, queryForm, canSaveSettings],
	);

	const handlePerPageChange = useCallback(
		(nextPerPage: number) => {
			if (nextPerPage === perPage) return;
			queryForm.setBase("page", 1, { shouldDirty: true });
			queryForm.setBase("per_page", nextPerPage, { shouldDirty: true });
			queryForm.submit({ resetPage: false });
			if (canSaveSettings) showTableSettingsReminder('perPage');
		},
		[queryForm, perPage, canSaveSettings],
	);

	const handleSortChange = useCallback(
		(columnId: string) => {
			if (!sortable?.includes(columnId)) return;

			const currentDir = sortDir ?? "asc";
			let nextCol: string | undefined = columnId;
			let nextDir: "asc" | "desc" | undefined = "asc";

			if (sortCol === columnId) {
				if (currentDir === "asc") {
					nextDir = "desc";
				} else {
					nextCol = undefined;
					nextDir = undefined;
				}
			}

			queryForm.setBase("sort_col", nextCol, { shouldDirty: true });
			queryForm.setBase("sort_dir", nextDir, { shouldDirty: true });
			queryForm.submit({ resetPage: true });
			if (canSaveSettings) showTableSettingsReminder('sort');
		},
		[sortable, sortCol, sortDir, queryForm, canSaveSettings],
	);

	return { pagination, handlePaginationChange, handlePerPageChange, handleSortChange };
}

