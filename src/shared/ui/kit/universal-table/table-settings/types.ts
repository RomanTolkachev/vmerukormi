import type { ColumnOrderState, ColumnPinningState, ColumnSizingState, VisibilityState } from "@tanstack/react-table";

export type IColumnsConfig = {
	order: ColumnOrderState;
	visible: VisibilityState;
	resized: ColumnSizingState;
	/** Пользовательские закрепления; служебные колонки выбора и действий не сохраняются. */
	pinned?: ColumnPinningState;
	view?: "table" | "cards";
	compact?: boolean;
};

export type ITableConfig = {
	tableName: string;
	columns: IColumnsConfig;
	/** Версионированное состояние query, сохранённое по кнопке настроек. */
	query?: Record<string, unknown>;
};

export type TGetTableOptionsResponse = {
	columns: IColumnsConfig | null;
	query?: Record<string, unknown> | null;
};

export type TSaveTableOptionsResponse = {
	status: boolean;
	options?: TGetTableOptionsResponse;
};

export type TableOptionsPatch = Pick<ITableConfig, "tableName"> & Partial<Pick<ITableConfig, "columns" | "query">> & {
	/** Обновить только соответствующую часть query, сохранив другую из последней записи на сервере. */
	queryScope?: "filters" | "listSettings";
};

