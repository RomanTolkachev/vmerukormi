/** `queryKey` таблицы: `[tableName, query]`. */
export type TableQueryKey<TQuery extends Record<string, unknown> = Record<string, unknown>> =
	readonly [tableName: string, query: TQuery] | readonly [tableName: string, query: TQuery, scope: string];

/** Убирает undefined / пустые строки, чтобы не плодить варианты queryKey. */
export function normalizeQuery<T extends Record<string, unknown>>(query: T): T {
	const normalized = { ...query } as Record<string, unknown>;

	for (const [key, value] of Object.entries(normalized)) {
		if (value === undefined) {
			delete normalized[key];
			continue;
		}
		if (typeof value === "string" && !value.trim()) {
			delete normalized[key];
		}
	}

	return normalized as T;
}

export function buildTableQueryKey<TQuery extends Record<string, unknown>>(
	tableName: string,
	query: TQuery,
	scope?: string,
): TableQueryKey<TQuery> {
	return scope === undefined ? [tableName, normalizeQuery(query)] : [tableName, normalizeQuery(query), scope];
}

