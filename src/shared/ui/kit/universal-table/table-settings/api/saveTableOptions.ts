import { getTableOptions } from "@/shared/ui/kit/universal-table/table-settings/api/getTableOptions";
import type { TableOptionsPatch, TSaveTableOptionsResponse } from "@/shared/ui/kit/universal-table/table-settings/types";
import { mergeUniversalTableSavedQuery } from "@/shared/ui/kit/universal-table/table-settings/savedState";

import { apiFetch } from "@/shared/api";

const pendingSaves = new Map<string, Promise<TSaveTableOptionsResponse>>();

async function executeSave(config: TableOptionsPatch): Promise<TSaveTableOptionsResponse> {
 // The endpoint replaces both sections. Read persisted data inside the save queue;
 // never fill an untouched section from the current, possibly unsaved UI state.
 const previous = await getTableOptions(config.tableName, undefined, true);
 const options = {
  columns: config.columns ?? previous.columns,
  query: mergeUniversalTableSavedQuery(previous.query, config.query, config.queryScope),
 };
	const res = await apiFetch(`/api/table-options/${encodeURIComponent(config.tableName)}`, {
		method: "PUT",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			tableName: config.tableName,
			columns: options.columns ?? {},
			query: options.query ?? {},
		}),
	});

	if (!res.ok) {
		throw new Error(`Ошибка сохранения настроек таблицы: ${res.status}`);
	}

	const payload = (await res.json()) as TSaveTableOptionsResponse;
	if (payload.status === false) {
		throw new Error("Не удалось сохранить настройки таблицы");
	}
	return { ...payload, options };
}

export function saveTableOptions(config: TableOptionsPatch): Promise<TSaveTableOptionsResponse> {
	const previous = pendingSaves.get(config.tableName) ?? Promise.resolve({ status: true });
	const current = previous.catch(() => ({ status: false })).then(() => executeSave(config));
	const clear = () => {
		if (pendingSaves.get(config.tableName) === current) pendingSaves.delete(config.tableName);
	};
	pendingSaves.set(config.tableName, current);
	void current.then(clear, clear);
	return current;
}

