import { mutationOptions } from "@tanstack/react-query";
import { saveTableOptions } from "@/shared/ui/kit/universal-table/table-settings/api/saveTableOptions";
import type { TableOptionsPatch } from "@/shared/ui/kit/universal-table/table-settings/types";

export const TableOptionsMutations = {
	all: () => ["table-options-mutations"] as const,
	updaters: () => [...TableOptionsMutations.all(), "update"] as const,
	update: (tableName: string) =>
		mutationOptions({
			mutationKey: [...TableOptionsMutations.updaters(), tableName],
			mutationFn: (config: TableOptionsPatch) => saveTableOptions(config),
		}),
} as const;

