import type { TGetTableOptionsResponse } from "@/shared/ui/kit/universal-table/table-settings/types";

/** Нет сохранённых настроек или бэк недоступен — таблица работает на дефолтах из meta. */
const EMPTY_TABLE_OPTIONS: TGetTableOptionsResponse = { columns: null, query: null };

export async function getTableOptions(
	tableName: string,
	signal?: AbortSignal,
	strict = false,
): Promise<TGetTableOptionsResponse> {
	const url = `/api/table-options/${encodeURIComponent(tableName)}`;

	try {
		const res = await fetch(url, { credentials: "include", signal });
		if (!res.ok) throw new Error(`Не удалось загрузить настройки: ${res.status}`);

		const json = (await res.json()) as TGetTableOptionsResponse & { visible?: Record<string, boolean>; order?: string[] };
		return { columns: json.columns ?? (json.visible || json.order ? { visible: json.visible ?? {}, order: json.order ?? [], resized: {} } : null), query: json.query ?? null };
	} catch (error) {
		if (strict) throw error;
		return EMPTY_TABLE_OPTIONS;
	}
}

