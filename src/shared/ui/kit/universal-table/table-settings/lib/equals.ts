/**
 * Стабильное сравнение двух структур по JSON. Сортирует ключи объектов, чтобы
 * `{ a, b }` и `{ b, a }` считались равными.
 *
 * Подходит для маленьких объектов (config колонок: order/visible/resized,
 * сохранённый query таблицы).
 */
export function isEqualByJson(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key, val) => {
		if (val && typeof val === "object" && !Array.isArray(val)) {
			const obj = val as Record<string, unknown>;
			return Object.keys(obj)
				.sort()
				.reduce<Record<string, unknown>>((acc, k) => {
					acc[k] = obj[k];
					return acc;
				}, {});
		}
		return val;
	});
}

