import { useEffect } from "react";
import type { TableQueryForm } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import type { TableBaseQuery, UniversalTableListResponse } from "@/shared/ui/kit/universal-table/types";

type UseResponsePageSyncParams<TQuery extends TableBaseQuery> = {
	isFetching: boolean;
	data: UniversalTableListResponse | undefined;
	queryForm: TableQueryForm<TQuery>;
	page: number;
};

/**
 * Бэк может вернуть другую страницу (например, если запрошенная вышла за пределы) —
 * синхронизируем форму без пользовательского коммита. Размер страницы задаёт
 * фронтенд; per_page из ответа не переопределяет выбранное значение.
 */
export function useResponsePageSync<TQuery extends TableBaseQuery>({
	isFetching,
	data,
	queryForm,
	page,
}: UseResponsePageSyncParams<TQuery>) {
	const responsePage = data?.page;

	useEffect(() => {
		if (isFetching || responsePage == null || responsePage === page) return;
		queryForm.setBase("page", responsePage, { shouldDirty: false });
		queryForm.submit({ resetPage: false });
	}, [isFetching, responsePage, page, queryForm]);
}

