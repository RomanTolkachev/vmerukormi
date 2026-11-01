import { queryOptions } from "@tanstack/react-query";
import { getTableOptions } from "@/shared/ui/kit/universal-table/table-settings/api/getTableOptions";

export const TableOptionsQueries = {
	all: () => ["table-options"] as const,
	get: ({ tableName }: { tableName: string }) =>
		queryOptions({
			queryKey: [...TableOptionsQueries.all(), tableName],
			queryFn: ({ signal }) => getTableOptions(tableName, signal),
			staleTime: 60_000,
			retry: false,
		}),
} as const;

