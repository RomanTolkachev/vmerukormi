import {useCallback, useMemo, useSyncExternalStore} from "react";
export type TUrlQuery = Record<string, string | string[]>;
export type TUrlQueryNormalizer<TQuery> = (query: TUrlQuery) => Partial<TQuery>;

const URL_QUERY_CHANGE_EVENT = "universal-table:url-query-change";
const EMPTY_QUERY = Object.freeze({}) as Readonly<Record<string, never>>;

type TUseUrlQueryOptions<TQuery extends object> = {
	enabled: boolean;
	normalize?: TUrlQueryNormalizer<TQuery>;
};

type TUseUrlQueryResult<TQuery extends object> = {
	query: Partial<TQuery>;
	getQuery: () => Partial<TQuery>;
	setQuery: (query: TQuery, replace?: boolean) => void;
};

function parseQuery(search: string): TUrlQuery {
	const searchParams = new URLSearchParams(search);
	const query: TUrlQuery = {};

	for (const [rawKey, value] of searchParams.entries()) {
		if (value === "") continue;

		const isArrayKey = rawKey.endsWith("[]");
		const key = isArrayKey ? rawKey.slice(0, -2) : rawKey;
		if (key === "") continue;

		const previous = query[key];

		if (previous === undefined) {
			query[key] = isArrayKey ? [value] : value;
		} else if (Array.isArray(previous)) {
			previous.push(value);
		} else {
			query[key] = [previous, value];
		}
	}

	return query;
}

function buildQuery(query: object): string {
	const searchParams = new URLSearchParams();

	for (const [key, rawValue] of Object.entries(query)) {
		if (rawValue === null || rawValue === undefined || rawValue === "") continue;

		if (Array.isArray(rawValue)) {
			for (const value of rawValue) {
				if (value === null || value === undefined || value === "") continue;
				searchParams.append(`${key}[]`, String(value));
			}
			continue;
		}

		searchParams.set(key, String(rawValue));
	}

	return searchParams.toString();
}

function getSearchSnapshot(): string {
	return typeof window === "undefined" ? "" : window.location.search;
}

function getServerSearchSnapshot(): string {
	return "";
}

/**
 * Синхронизирует применённый query со строкой поиска без зависимости от React Router.
 * При `enabled=false` возвращает стабильный пустой query, а `setQuery` ничего не делает.
 */
export function useUrlQuery<TQuery extends object>({
	enabled,
	normalize,
}: TUseUrlQueryOptions<TQuery>): TUseUrlQueryResult<TQuery> {
	const subscribe = useCallback(
		(listener: () => void) => {
			if (!enabled || typeof window === "undefined") return () => undefined;

			window.addEventListener("popstate", listener);
			window.addEventListener(URL_QUERY_CHANGE_EVENT, listener);

			return () => {
				window.removeEventListener("popstate", listener);
				window.removeEventListener(URL_QUERY_CHANGE_EVENT, listener);
			};
		},
		[enabled],
	);

	const search = useSyncExternalStore(
		subscribe,
		enabled ? getSearchSnapshot : getServerSearchSnapshot,
		getServerSearchSnapshot,
	);

	const query = useMemo((): Partial<TQuery> => {
		if (!enabled) return EMPTY_QUERY as Partial<TQuery>;

		const rawQuery = parseQuery(search);
		return normalize ? normalize(rawQuery) : (rawQuery as Partial<TQuery>);
	}, [enabled, normalize, search]);

	const getQuery = useCallback(() => query, [query]);

	const setQuery = useCallback(
		(nextQuery: TQuery, replace = true) => {
			if (!enabled || typeof window === "undefined") return;

			const searchString = buildQuery(nextQuery);
			const nextUrl = `${window.location.pathname}${searchString ? `?${searchString}` : ""}${window.location.hash}`;
			const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

			if (nextUrl === currentUrl) return;

			const method = replace ? "replaceState" : "pushState";
			window.history[method](window.history.state, "", nextUrl);
			window.dispatchEvent(new Event(URL_QUERY_CHANGE_EVENT));
		},
		[enabled],
	);

	return useMemo(
		() => ({query, getQuery, setQuery}),
		[query, getQuery, setQuery],
	);
}

