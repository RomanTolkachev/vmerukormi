import type { UseQueryOptions } from "@tanstack/react-query";
import type { IColumnsConfig } from "@/shared/ui/kit/universal-table/table-settings/types";
import type { ReactNode } from "react";
import type { OrderedTableProps } from "@/shared/ui/kit/universal-table/ordered-table/types";

/** Минимальный контракт query таблицы — то, чем управляет shared. */
export type TableBaseQuery = {
	page: number;
	per_page: number;
	search: string;
	sort_col?: string;
	sort_dir?: "asc" | "desc";
};

/** Сырые параметры из URL до приведения строк к типам конкретной таблицы. */
export type UniversalTableUrlQuery = Record<string, string | string[]>;

/** Приводит строковые параметры URL к частичному query конкретной таблицы. */
export type UniversalTableUrlQueryNormalizer<TQuery extends TableBaseQuery> = (
	rawQuery: UniversalTableUrlQuery,
) => Partial<TQuery>;

/** Настройки синхронизации query таблицы с параметрами адресной строки. */
export type UniversalTableUrlQuerySync<TQuery extends TableBaseQuery> = {
	/** Включает чтение query из URL и запись изменений таблицы обратно в URL. */
	enabled: boolean;
	/**
	 * Преобразует строковые значения URL в типы `TQuery`: числа, boolean и
	 * допустимые значения сортировки. Без функции значения остаются строками.
	 */
	normalize?: UniversalTableUrlQueryNormalizer<TQuery>;
};

/** Метаданные колонки из ответа списка. */
export type UniversalTableColumnMeta = {
	name: string;
	label: string;
	visible?: boolean;
	sort_order?: number;
	type?: string;
};

/** Контекст вызова queryFn: сигнал отмены устаревшего запроса строк. */
export type UniversalTableQueryFnContext = {
	signal: AbortSignal;
};

/** Ответ queryFn: строки + мета колонок + total. */
export type UniversalTableListResponse<TRow = Record<string, unknown>> = {
	rows: TRow[];
	total: number;
	columns: UniversalTableColumnMeta[];
	page?: number;
	per_page?: number;
	supports_soft_delete?: boolean;
};

export type UniversalTableState = {
	/** Видимые пользовательские колонки в текущем порядке, без selection/actions. */
	visibleColumnIds: readonly string[];
	view: "table" | "cards";
	isCompact: boolean;
};

/** Fixed widths, or a separate width for each row density (in px). */
export type UniversalTableActionCellWidth = number | { normal: number; compact: number };

/** Контекст, передаваемый в карточки, ячейки и toolbar-слоты. */
export type UniversalTableActionContext<
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
> = {
	tableName: string;
	/** Последний ответ `queryFn` (undefined до первой успешной загрузки). */
	data: TResponse | undefined;
	/** Текущее отображение, включая ещё не сохранённые изменения настроек. */
	tableState: UniversalTableState;
	invalidateRows: () => void;
};

export type UniversalTableDocumentActionContext<
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
> = UniversalTableActionContext<TResponse> & {
	/** Нет выбранных строк, идёт загрузка или включён карточный вид. */
	disabled: boolean;
};

/** Функция создаёт стандартную кнопку; {render} передаёт полный контроль фиче. */
export type UniversalTableDocumentSlot<
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
> =
	| ((selectedIds: readonly string[], ctx: UniversalTableActionContext<TResponse>) => void | Promise<void>)
	| {
		/** Используйте Shared IconButton и передайте ему ctx.disabled. */
		render: (selectedIds: readonly string[], ctx: UniversalTableDocumentActionContext<TResponse>) => ReactNode;
	};

/** Метаданные для резолва id строки (колонки из последнего ответа списка). */
export type TableRowIdMeta = {
	columns: UniversalTableColumnMeta[];
};

/** Контекст пользовательского отображения количества выбранных строк. */
export type UniversalTableSelectedCountRenderContext = {
	/** Текущее количество выбранных строк. */
	count: number;
};

/** Отображение счётчика выбранных строк рядом с выбором размера страницы. */
export type UniversalTableSelectedCountConfig = {
	/**
	 * Пользовательское отображение счётчика. Если не передано, таблица выводит
	 * стандартный `Typography` с текстом «Выбрано: N».
	 */
	render?: (context: UniversalTableSelectedCountRenderContext) => ReactNode;
};

export type UniversalTableRowSelectionConfig<TRow extends Record<string, unknown>> = {
	enabled: boolean;
	maxSelected?: number;
	getRowId?: (row: TRow, index: number, meta: TableRowIdMeta) => string;
	/** Пользовательское отображение счётчика; при enabled он показывается автоматически. */
	selectedCount?: UniversalTableSelectedCountConfig;
};

/**
 * Резолвер whitelist сортируемых колонок. Получает контекст таблицы (включая
 * последний ответ `ctx.data`) и возвращает имена колонок, по которым доступна
 * сортировка — например, те, у которых в meta `sortable` присутствует и truthy.
 */
export type UniversalTableSortableResolver<
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
> = (ctx: UniversalTableActionContext<TResponse>) => readonly string[];

export type UniversalTableSettingsButtonConfig = {
 enabled: boolean;
 title?: string;
 visibilityBar?: boolean;
 /** Compatibility: rendered in the separate filters popup. Prefer filtersButton. */
 filtersPanel?: () => ReactNode;
};

export type UniversalTableResizeConfig = boolean | readonly string[] | {
 mode: "both" | "settings";
 columns?: readonly string[];
};

export type UniversalTableAppliedFilter<TQuery extends TableBaseQuery = TableBaseQuery> = {
 key: string;
 label: string;
 /** A range can remove both bounds together. Values revert to defaults. */
 fields: readonly Extract<keyof TQuery, string>[];
};

export type UniversalTableFiltersConfig<TQuery extends TableBaseQuery = TableBaseQuery> = {
 /** Entity fields below the built-in sort and page-size controls. The popup is available without this slot. */
 render: () => ReactNode;
 /** Domain labels/options stay in the entity; only committed query is passed. */
 applied?: (query: Readonly<TQuery>, defaults: Readonly<TQuery>) => readonly UniversalTableAppliedFilter<TQuery>[];
};

/**
 * Произвольная кнопка в тулбаре (после settingsButton).
 * Сам компонент-кнопка может подписаться через useSelection() / useTableQuery().
 */
export type UniversalTableExtraButton<
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
> = {
	key: string;
	render: (ctx: UniversalTableActionContext<TResponse>) => ReactNode;
};

/**
 * Декларативная кастомная колонка с произвольным рендером ячейки.
 * По умолчанию встаёт после колонок данных и ведёт себя как обычная колонка:
 * участвует в изменении порядка в настройках, ресайзе и настройках видимости. Серверной
 * сортировки нет (её id не попадает в whitelist `sortable`).
 */
export type UniversalTableCustomColumn<
	TRow extends Record<string, unknown>,
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
> = {
	/** Уникальный id колонки. */
	id: string;
	/** Заголовок колонки (произвольный ReactNode). По умолчанию пусто. */
	header?: ReactNode;
	/**
	 * Подпись в popup настроек видимости. Если не задана — берётся `header`
	 * (когда это строка), иначе `id`.
	 */
	label?: string;
	/** Скрыть колонку по умолчанию (можно включить в настройках). */
	defaultHidden?: boolean;
	/**
	 * Ширина колонки в px. Применяется к колонке и сидируется в настройку
	 * (`resized`) при создании; если не задана — дефолт таблицы.
	 */
	width?: number;
	/** Рендер ячейки: получает контекст таблицы и строку. */
	render: (ctx: UniversalTableActionContext<TResponse>, row: TRow) => ReactNode;
};

/** Мета кастомной колонки для настроек (id + подпись + дефолт видимости/ширины). */
export type UniversalTableCustomColumnMeta = {
	id: string;
	label: string;
	defaultHidden?: boolean;
	width?: number;
};

/** Search draft is applied by Enter/check; clear removes only this search. */
export type UniversalTableSearchConfig<TQuery extends TableBaseQuery = TableBaseQuery> = {
	enabled: true;
	/** Placeholder текстового поля. */
	placeholder?: string;
	/**
	 * Имя поля в `TQuery`, под которым регистрируется input (React Hook Form).
	 * По умолчанию `search`. Ключ должен быть в `defaults`.
	 */
	name?: Extract<keyof TQuery, string>;
};

/** Search → inline slot → fixed actions → filters → settings. */
export type UniversalTableToolbarConfig<
 TResponse extends UniversalTableListResponse = UniversalTableListResponse,
 TQuery extends TableBaseQuery = TableBaseQuery,
> = {
 /** Compatibility alias for bottomSlot. */
 leftSlot?: (ctx: UniversalTableActionContext<TResponse>) => ReactNode;
 inlineSlot?: (ctx: UniversalTableActionContext<TResponse>) => ReactNode;
 bottomSlot?: (ctx: UniversalTableActionContext<TResponse>) => ReactNode;
 search?: UniversalTableSearchConfig<TQuery>;
 settingsButton?: UniversalTableSettingsButtonConfig;
 filtersButton?: UniversalTableFiltersConfig<TQuery>;
 /** Domain actions such as print/export, placed before filters/settings. */
 extraButtons?: UniversalTableExtraButton<TResponse>[];
};

export type UniversalTableSettingsOpenPayload = {
 columnIds: readonly string[];
 columnLabels: Record<string, string>;
 persistColumns: readonly string[];
 columns: IColumnsConfig;
 defaults: IColumnsConfig;
 /** Есть изменения отображения относительно последнего успешного сохранения. */
 hasDisplayChanges: boolean;
 savedQuery?: Record<string, unknown>;
 update: (columns: IColumnsConfig) => void;
 saveDisplay: (query: Record<string, unknown>) => Promise<void>;
 saveQuery: (query: Record<string, unknown>) => Promise<void>;
};

/** Пропсы OrderedTable, которыми UniversalTable управляет сам — нельзя задавать снаружи. */
type ManagedOrderedTableProps =
	| "tableData"
	| "dataColumnIds"
	| "getDataCellValue"
	| "columnTranslateData"
	| "columnsOrder"
	| "onColumnsOrderChange"
	| "columnVisible"
	| "onColumnVisibilityChange"
	| "columnSizing"
	| "onColumnSizingChange"
	| "resizable"
	| "pagination"
	| "onPaginationChange"
	| "rowCount"
	| "perPage"
	| "onPerPageChange"
	| "selectedRowIds"
	| "onSelectedRowIdsChange"
	| "sortableColumns"
	| "sortCol"
	| "sortDir"
	| "onSortChange";

/** CSS-переменные плотности табличной зоны (`tableArea`). Не влияют на toolbar. */
export type UniversalTableSizeTokens = {
	/** `--table-text-xs`: body2 normally, body3 in compact mode. */
	textXs?: string;
	/** `--table-text-xs-line-height`: line height of the chosen typography. */
	textXsLineHeight?: string;
	/** `--table-spacing-1`, fallback: `--spacing-1` */
	spacing1?: string;
	/** `--table-spacing-2`, fallback: `--spacing-2` */
	spacing2?: string;
	/** `--table-spacing-4`, fallback: `--spacing-4` */
	spacing4?: string;
	/** `--table-spacing-8`, fallback: `--spacing-8` */
	spacing8?: string;
};

/**
 * Стартовые ширины колонок данных (px), ключ = id колонки / поле строки.
 *
 * Строгость ключей зависит от generic `TRow`: при конкретном типе строки (например,
 * `AdmcaseRow`) лишние ключи — ошибка TypeScript; при `Record<string, …>` допустим
 * любой string-ключ.
 */
export type UniversalTableColumnSizeData<TRow extends Record<string, unknown>> = Partial<
	Record<Extract<keyof TRow, string>, number>
>;

/**
 * @typeParam TRow Нормализованная строка, которую получает `OrderedTable`.
 * @typeParam TQuery Состояние параметров списка: пагинация, поиск, сортировка и фильтры.
 * @typeParam TResponse Табличный ответ после `queryOptions.select`: строки, колонки и total.
 * @typeParam TQueryFnData Сырой ответ `queryFn` до преобразования через `select`.
 */
export type UniversalTableProps<
	TRow extends Record<string, unknown>,
	TQuery extends TableBaseQuery = TableBaseQuery,
	TResponse extends UniversalTableListResponse = UniversalTableListResponse,
	TQueryFnData = TResponse,
> = Omit<OrderedTableProps<TRow>, ManagedOrderedTableProps | "customColumns" | "columnSizeData"> & {
	/**
	 * Уникальное имя экземпляра таблицы. Используется в query key строк,
	 * а также при загрузке и сохранении пользовательских настроек.
	 */
	tableName: string;
	/** Additional data scope in the rows cache; does not split saved settings. */
	queryScopeKey?: string;
	/** Committed query, including initial defaults/preset/URL. Draft edits are not emitted. */
	onQueryChange?: (query: Readonly<TQuery>) => void;
	/**
	 * Разрешает синхронизацию пользовательских настроек. При `false` таблица
	 * работает на дефолтных колонках и query, не загружая и не сохраняя options.
	 *
	 * @default true
	 */
	shouldFetchUserSettings?: boolean;
	/**
	 * Ключи колонок, которые пользователь не может скрыть в настройках.
	 * Их чекбоксы всегда отмечены и заблокированы, а сохранённое `visible: false`
	 * для этих id игнорируется.
	 *
	 * Допустимые значения выводятся из ключей `TRow`, поэтому IDE предлагает
	 * имена колонок и подсвечивает неизвестные ключи.
	 *
	 * @example
	 * persistColumns={["individualId", "surname"]}
	 *
	 * @default []
	 */
	persistColumns?: readonly Extract<keyof TRow, string>[];
	/**
	 * Управляет изменением ширины колонок в таблице и настройках.
	 *
	 * - `true` — ресайз разрешён для всех поддерживающих его колонок;
	 * - `false` — ресайз выключен полностью;
	 * - массив id — ресайз разрешён только перечисленным колонкам.
	 *
	 * Запрещённые для ресайза колонки по-прежнему используют ширину из сохранённых
	 * пользовательских `options`, а при её отсутствии — из `columnSizeData`.
	 * Для запрещённых колонок не отображается ручка ресайза и курсор изменения ширины.
	 *
	 * @example
	 * // Запретить ручной ресайз всех колонок.
	 * resizable={false}
	 *
	 * @example
	 * // Разрешить ручной ресайз только двум колонкам.
	 * resizable={["surname", "createdAt"]}
	 *
	 * Явный проп приоритетнее устройства. Без пропа: true на desktop,
	 * {mode: "settings"} при useIsTouchable(). mode="settings" убирает только ручки.
	 */
	resizable?: UniversalTableResizeConfig;
  /** Renders a complete card, including its own shell and actions. Absence disables the Cards setting. */
	cardsView?: {
		defaultCard?: boolean;
		render: (ctx: UniversalTableActionContext<TResponse>, row: TRow) => ReactNode;
	};
	/**
	 * Синхронизирует закоммиченные параметры таблицы с URL. Это сохраняет поиск,
	 * пагинацию, сортировку и фильтры при навигации и позволяет делиться ссылкой.
	 *
	 * Изменения таблицы заменяют текущую запись history, а переходы браузера
	 * «назад/вперёд» восстанавливают query таблицы.
	 *
	 * `normalize` преобразует строковые значения из URL в типы `TQuery`
	 * (`number`, `boolean` и т.д.).
	 *
	 * @example
	 * syncUrlQuery={{
	 *   enabled: true,
	 *   normalize: raw => ({
	 *     page: Number(raw.page) || 1,
	 *     archive: raw.archive === "true",
	 *   }),
	 * }}
	 *
	 * @default undefined — синхронизация выключена
	 */
	syncUrlQuery?: UniversalTableUrlQuerySync<TQuery>;
	/**
	 * Переопределения дефолтов query. Базовые поля (`page` / `per_page` / `search`)
	 * подставляются автоматически — здесь достаточно указать нужные ключи.
	 * Тип `Partial<TQuery>` ⇒ принимаются только валидные имена полей query.
	 */
	defaults?: Partial<TQuery>;
	/**
	 * Функция загрузки данных. Получает закоммиченные параметры пагинации,
	 * поиска, сортировки и фильтров и возвращает сырой ответ сервера.
	 * `signal` отменяет запрос, когда параметры таблицы сменились до ответа.
	 */
	queryFn: (query: TQuery, context: UniversalTableQueryFnContext) => Promise<TQueryFnData>;
	/**
	 * Дополнительные настройки TanStack Query для запроса строк.
	 * `queryKey` и `queryFn` формирует сама таблица, поэтому переопределить их нельзя.
	 * Временные значения TanStack Query (`staleTime`, `gcTime`) задаются в миллисекундах.
	 *
	 * @example
	 * queryOptions={{
	 *   staleTime: Infinity,
	 *   gcTime: 2 * 60 * 1000,
	 *   retry: false,
	 *   select: response => normalizeResponse(response),
	 * }}
	 */
	queryOptions?: Omit<
		UseQueryOptions<TQueryFnData, Error, TResponse>,
		"queryKey" | "queryFn"
	>;
	/**
	 * Кастомное преобразование ответа `queryFn` в строки таблицы (`tableData`).
	 *
	 * По умолчанию используются `response.rows` без изменений. Полный объект строки
	 * доступен в `customColumns.render`, `actionCell` и `rowSelection.getRowId`, но
	 * обычные колонки создаются только из `response.columns`.
	 *
	 * Сигнатура: `(response: TResponse) => TRow[]`. Результат используется в ячейках,
	 * `customColumns.render`, `actionCell` и `rowSelection.getRowId`.
	 *
	 * @example
	 * mapRows={response => response.rows.map(row => ({ ...row, title: String(row.title) }))}
	 */
	mapRows?: (response: TResponse) => TRow[];
	/** Search, two optional slots, applied chips and separate settings/filters popups. */
	toolbar?: UniversalTableToolbarConfig<TResponse, TQuery>;
	/** Необязательные действия справа перед фильтрами и настройками. В карточках disabled. */
	excelSlot?: UniversalTableDocumentSlot<TResponse>;
	printSlot?: UniversalTableDocumentSlot<TResponse>;
	wordSlot?: UniversalTableDocumentSlot<TResponse>;
	/**
	 * Колонка действий — крайняя правая, закреплена (`columnPinning`). Если задан,
	 * рендерится для каждой строки. Ширину колонки задаёт `actionCellWidth`.
	 *
	 * Сигнатура: `(ctx, row) => ReactNode`.
	 *
	 * - `ctx.tableName` — ключ таблицы (queryKey, id настроек);
	 * - `ctx.data` — последний ответ `queryFn`;
	 * - `ctx.invalidateRows()` — сброс кеша строк таблицы;
	 * - `row` — нормализованная строка (`tableData`), та же, что в ячейках данных.
	 *
	 * Колонка не участвует в изменении порядка, ресайзе и настройках видимости. Серверной
	 * сортировки нет. На кликах внутри ячейки обычно ставят `stopPropagation`,
	 * чтобы не срабатывал `onRowClick`.
	 *
	 * @example
	 * actionCell={(ctx, row) => <MyActionsCell row={row} ctx={ctx} />}
	 */
	actionCell?: (ctx: UniversalTableActionContext<TResponse>, row: TRow) => ReactNode;
	/**
	 * Ширина колонки действий (`actionCell`) в px. По умолчанию 120.
	 * Объект {normal, compact} переключает ширину вместе с плотностью строк.
	 * Не ресайзится пользователем. Для кастомных колонок (`customColumns`) ширину
	 * задают ключом `width` у элемента массива.
	 */
	actionCellWidth?: UniversalTableActionCellWidth;
	/**
	 * Декларативные кастомные колонки. Каждая задаёт `render(ctx, row)` и по умолчанию
	 * встаёт после колонок данных (перед `actionCell`). Участвуют в изменении порядка в настройках,
	 * ресайзе и настройках видимости (сохраняются вместе с остальными колонками).
	 * Серверной сортировки нет — id не попадает в whitelist `sortable`.
	 *
	 * Ширину кастомной колонки задаёт ключ `width` (px). Ширину колонки действий —
	 * проп `actionCellWidth`.
	 *
	 * Ключи элемента массива:
	 * - `id` — уникальный id колонки (обязательный);
	 * - `render(ctx, row)` — рендер ячейки (обязательный);
	 * - `header` — заголовок в шапке (по умолчанию пусто);
	 * - `label` — подпись в popup настроек (иначе `header` или `id`);
	 * - `defaultHidden` — скрыть по умолчанию;
	 * - `width` — ширина в px (сидирует `resized`, иначе дефолт таблицы 150).
	 */
	customColumns?: UniversalTableCustomColumn<TRow, TResponse>[];
	/**
	 * Включает колонку-чекбокс и предоставляет хук `useSelection()` внутри компонентов
	 * (extraButtons, actionCell, filtersPanel). Selection живёт в Context, изменения
	 * затрагивают только подписчиков — основная таблица не пере-рендеривается.
	 *
	 * `getRowId` — entity-специфичный резолвер id (например, PK из meta колонок).
	 * Если не задан — используется проп `getRowId` таблицы или дефолт `resolveRowId`.
	 *
	 * `maxSelected` ограничивает количество выбранных строк. При достижении лимита
	 * остальные чекбоксы блокируются, а общий чекбокс «выбрать все» не рендерится.
	 * Ограничение действует и для программного вызова `setSelected`.
	 *
	 * При `enabled: true` рядом с выбором размера страницы автоматически отображается счётчик.
	 * Без `selectedCount.render` используется текст «Выбрано: N». Через `render`
	 * можно полностью заменить внешний вид счётчика.
	 *
	 * @example
	 * rowSelection={{
	 *   enabled: true,
	 *   selectedCount: {
	 *     render: ({ count }) => <MyCounter count={count} />,
	 *   },
	 * }}
	 */
	rowSelection?: UniversalTableRowSelectionConfig<TRow>;
	/**
	 * Whitelist колонок, по которым можно сортировать (стрелка в header + клик).
	 * Либо массив имён колонок (`keyof TRow`), либо колбэк `(ctx) => string[]`,
	 * который вычисляет whitelist из ответа (например, колонки с `sortable` в meta).
	 * Состояние хранится в `sort_col` / `sort_dir` query; цикл: asc → desc → сброс.
	 */
	sortable?: readonly (keyof TRow)[] | UniversalTableSortableResolver<TResponse>;
	/**
	 * Стартовые ширины колонок данных в px (до пользовательского ресайза).
	 *
	 * Ключи — id колонок таблицы (`name` из meta API / поля `TRow`). Значения попадают
	 * в `size` колонок `OrderedTable` и используются, пока в сохранённых настройках
	 * (`tableName` → `columns.resized` на бэке) нет своих ширин.
	 *
	 * Не затрагивает колонку действий (`actionCell`) — её ширина задаётся
	 * `actionCellWidth`. Колонку выделения (`rowSelection`) — фиксированные 48px.
	 *
	 * Для проверки ключей на этапе компиляции задавайте `TRow` с известными полями
	 * (например, `AdmcaseRow`), а не `Record<string, …>`. Константу удобно типизировать
	 * через `satisfies UniversalTableColumnSizeData<AdmcaseRow>`.
	 *
	 * @example
	 * const widths = {
	 *   violation_date: 101,
	 *   document_num: 131,
	 * } satisfies UniversalTableColumnSizeData<AdmcaseRow>;
	 *
	 * <UniversalTable<AdmcaseRow, AdmcaseQuery, AdmcaseListResponse>
	 *   columnSizeData={widths}
	 *   ...
	 * />
	 */
	columnSizeData?: UniversalTableColumnSizeData<TRow>;
	/**
	 * Компактная табличная зона: уменьшенные шрифт и отступы ячеек через `--table-*`
	 * CSS-переменные на `.tableArea`. Toolbar (поиск, кнопки из `extraButtons`, `leftSlot`)
	 * **не** масштабируется.
	 *
	 * При `true` подставляется встроенный compact-пресет; его можно
	 * переопределить точечно через `sizeTokens`.
	 *
	 * @default false
	 */
	compact?: boolean;
	/**
	 * Точечное переопределение `--table-*` переменных на `.tableArea`.
	 * Ключи маппятся на CSS custom properties с fallback на токены Typography body2 /
	 * `--spacing-*` в стилях `OrderedTable`.
	 *
	 * `sizeTokens` имеет приоритет над типографикой и отступами выбранной плотности.
	 *
	 * @example
	 * compact
	 * sizeTokens={{ spacing4: "10px" }}
	 */
	sizeTokens?: UniversalTableSizeTokens;
};

