import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";
import type { TableOptionsPatch } from "@/shared/ui/kit/universal-table/table-settings/types";

const UNIVERSAL_TABLE_STATE_KEY = "universalTableState";
const UNIVERSAL_TABLE_STATE_VERSION = 1;
const LIST_SETTINGS_KEYS = new Set(["sort_col", "sort_dir", "per_page"]);

type UniversalTableSavedState = {
	version: typeof UNIVERSAL_TABLE_STATE_VERSION;
	query: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Вызывается внутри очереди сохранения, после чтения актуальной записи. */
export function mergeUniversalTableSavedQuery(
	previous: Record<string, unknown> | null | undefined,
	next: Record<string, unknown> | undefined,
	scope?: TableOptionsPatch["queryScope"],
): Record<string, unknown> | null | undefined {
	if (!next) return previous;
	if (!scope) return next;
	const read = (value: Record<string, unknown> | null | undefined) => {
		const state = value?.[UNIVERSAL_TABLE_STATE_KEY];
		return isRecord(state) && state.version === UNIVERSAL_TABLE_STATE_VERSION && isRecord(state.query) ? state.query : {};
	};
	const belongsToScope = (key: string) => LIST_SETTINGS_KEYS.has(key) === (scope === "listSettings");
	const untouched = Object.fromEntries(Object.entries(read(previous)).filter(([key]) => !belongsToScope(key)));
	const replacement = Object.fromEntries(Object.entries(read(next)).filter(([key]) => belongsToScope(key)));
	return {
		...previous,
		[UNIVERSAL_TABLE_STATE_KEY]: { version: UNIVERSAL_TABLE_STATE_VERSION, query: { ...untouched, ...replacement } },
	};
}

export function readUniversalTableSavedQuery<TQuery extends TableBaseQuery>(
	querySettings: Record<string, unknown> | null | undefined,
	quickSearchKey: Extract<keyof TQuery, string> = "search" as Extract<keyof TQuery, string>,
): Partial<TQuery> | undefined {
	const state = querySettings?.[UNIVERSAL_TABLE_STATE_KEY];
	if (!isRecord(state) || state.version !== UNIVERSAL_TABLE_STATE_VERSION) return undefined;
	if (!isRecord(state.query)) return undefined;

	const query = { ...state.query } as Partial<TQuery> & Record<string, unknown>;
	delete query.page;
	delete query.search;
	delete query[quickSearchKey];
	if (state.query.sort_col === null) query.sort_col = undefined;
	if (state.query.sort_dir === null) query.sort_dir = undefined;
	return query as Partial<TQuery>;
}

export function createUniversalTableSavedQuery<TQuery extends TableBaseQuery>(
	query: TQuery,
	quickSearchKey: Extract<keyof TQuery, string> = "search" as Extract<keyof TQuery, string>,
): Record<string, unknown> {
	const savedQuery = { ...query } as Record<string, unknown>;
	delete savedQuery.page;
	delete savedQuery.search;
	delete savedQuery[quickSearchKey];

	const sortColumn = typeof query.sort_col === "string" ? query.sort_col.trim() : "";
	if (sortColumn) {
		savedQuery.sort_col = sortColumn;
		savedQuery.sort_dir = query.sort_dir === "desc" ? "desc" : "asc";
	} else {
		// `undefined` исчезает из JSON и не сможет перекрыть дефолтную сортировку.
		savedQuery.sort_col = null;
		savedQuery.sort_dir = null;
	}

	const state: UniversalTableSavedState = {
		version: UNIVERSAL_TABLE_STATE_VERSION,
		query: savedQuery,
	};
	return { [UNIVERSAL_TABLE_STATE_KEY]: state };
}

