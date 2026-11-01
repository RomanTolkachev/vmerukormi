import type { IColumnsConfig } from "@/shared/ui/kit/universal-table/table-settings/types";
import { normalizeColumnPinning } from "@/shared/ui/kit/universal-table/lib/columnPinning";

export function normalizeColumnsConfig(config: Partial<IColumnsConfig> | undefined): IColumnsConfig {
	return {
		order: config?.order ?? [],
		visible: config?.visible ?? {},
		resized: config?.resized ?? {},
		pinned: normalizeColumnPinning(config?.pinned, config?.order ?? [], config?.visible),
		view: config?.view,
		compact: config?.compact,
	};
}

/** Синхронизирует сохранённый order/visible с актуальными колонками из API. */
export function mergeColumnsConfig(
	saved: Partial<IColumnsConfig>,
	fallback: IColumnsConfig,
): IColumnsConfig {
	const savedNorm = normalizeColumnsConfig(saved);
	const fallbackNorm = normalizeColumnsConfig(fallback);
	const validIds = new Set(fallbackNorm.order);
	const order = [
		...savedNorm.order.filter(id => validIds.has(id)),
		...fallbackNorm.order.filter(id => !savedNorm.order.includes(id)),
	];

	// Видимость: сохранённый/ручной конфиг ПОЛНОСТЬЮ перекрывает метадефолт для колонок,
	// которые он уже знает (присутствуют в saved.order). Иначе дефолтно-скрытую в метаданных
	// колонку нельзя было бы включить — «показать» кодируется отсутствием ключа в visible,
	// а метадефолтный `false` затирал бы это намерение. Метадефолт применяем только к НОВЫМ
	// колонкам API, которых сохранённый конфиг ещё не видел.
	const knownIds = new Set(savedNorm.order);
	const visible: IColumnsConfig["visible"] = {};
	for (const [id, hidden] of Object.entries(fallbackNorm.visible)) {
		if (validIds.has(id) && !knownIds.has(id)) visible[id] = hidden;
	}
	for (const [id, hidden] of Object.entries(savedNorm.visible)) {
		if (validIds.has(id)) visible[id] = hidden;
	}

	const resized: IColumnsConfig["resized"] = { ...fallbackNorm.resized };
	for (const [id, width] of Object.entries(savedNorm.resized)) {
		if (validIds.has(id) && width > 0) resized[id] = width;
	}

	return {
		order, visible, resized,
		pinned: normalizeColumnPinning(savedNorm.pinned, order, visible),
		view: savedNorm.view ?? fallbackNorm.view, compact: savedNorm.compact ?? fallbackNorm.compact,
	};
}

