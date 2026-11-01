import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	type ReactNode,
} from "react";
import {
	FormProvider,
	useForm,
	type DefaultValues,
	type Path,
	type PathValue,
	type SetValueConfig,
	type UseFormReturn,
} from "react-hook-form";
import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";
import { normalizeTablePerPage } from "@/shared/ui/kit/universal-table/lib/perPage";

export type TableQuerySubmitOptions<TQuery extends TableBaseQuery = TableBaseQuery> = {
	/** Сбросить page на 1 при коммите (true при изменении фильтров). */
	resetPage?: boolean;
	/** Отложить коммит на N мс (debounce). Повторный submit отменяет предыдущий. */
	debounceMs?: number;
	/** Применить перед коммитом — когда меняем поле и сразу submit в одном handler. */
	patch?: Partial<TQuery>;
};

export type TableQueryForm<TQuery extends TableBaseQuery = TableBaseQuery> = Omit<
	UseFormReturn<TQuery>,
	"reset" | "handleSubmit"
> & {
	/** Закоммитить форму → queryState (обновит queryKey, дёрнет fetch). */
	submit: (options?: TableQuerySubmitOptions<TQuery>) => void;
	/**
	 * Сбросить форму и закоммитить. Без аргумента используются абсолютные `defaults`,
	 * с аргументом — переданный полный query.
	 */
	resetForm: (nextQuery?: TQuery) => void;
	/** Откатить форму к последнему закоммиченному queryState (без commit). */
	revertToCommitted: () => void;
	/** Заменить черновик формы без коммита и без запроса строк. */
	replaceDraft: (nextQuery: TQuery) => void;
	/** Абсолютные дефолты — для resetForm и для entity-кода. */
	defaults: TQuery;
	committed: TQuery;
	/**
	 * Типобезопасный сеттер для полей `TableBaseQuery` (page, per_page, search, …).
	 * Скрывает приведение типов, неизбежное при работе с RHF и generic-формой.
	 */
	setBase: <K extends keyof TableBaseQuery>(
		name: K,
		value: TableBaseQuery[K],
		options?: SetValueConfig,
	) => void;
	/** Типобезопасный setValue для любого поля TQuery (в т.ч. entity-фильтров). */
	setField: <K extends keyof TQuery>(
		name: K,
		value: TQuery[K],
		options?: SetValueConfig,
	) => void;
};

const TableQueryContext = createContext<TableQueryForm<TableBaseQuery> | null>(null);

type TableQueryFormProviderProps<TQuery extends TableBaseQuery> = {
	children: ReactNode;
	defaults: TQuery;
	queryState: TQuery;
	onQueryChange: (next: TQuery) => void;
};

export function TableQueryFormProvider<TQuery extends TableBaseQuery>({
	children,
	defaults,
	queryState,
	onQueryChange,
}: TableQueryFormProviderProps<TQuery>) {
	// Форма стартует с закоммиченного queryState (включая сохранённые настройки), а не только defaults —
	// иначе опциональные поля не попадают в RHF до mount Controller и devtools их не видит.
	const form = useForm<TQuery>({
		defaultValues: { ...defaults, ...queryState } as DefaultValues<TQuery>,
	});
	const { getValues, reset, register } = form;

	// Явно регистрируем все ключи query из defaults. Иначе RHF (и devtools) «знает» о поле
	// только после mount его Controller — а фильтры в модалке / чекбоксы на setValue
	// монтируются позже или вовсе без Controller, из-за чего форма выглядит пустой.
	// register идемпотентен; когда Controller для того же имени смонтируется — он перехватит поле.
	for (const name of Object.keys(defaults)) {
		register(name as Path<TQuery>);
	}

	const queryStateRef = useRef(queryState);

	useEffect(() => {
		queryStateRef.current = queryState;
		reset(queryState as DefaultValues<TQuery>, {keepDirty: false});
	}, [queryState, reset]);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const submit = useCallback(
		(options?: TableQuerySubmitOptions<TQuery>) => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}

			const commit = () => {
				const values = { ...getValues(), ...options?.patch } as TQuery;
				const search = typeof values.search === "string" ? values.search.trim() : values.search;
				const next = normalizeTablePerPage({
					...values,
					search,
					page: options?.resetPage ? 1 : values.page,
				} as TQuery);
				onQueryChange(next);
				reset(next as DefaultValues<TQuery>, { keepDirty: false });
			};

			if (options?.debounceMs && options.debounceMs > 0) {
				debounceTimerRef.current = setTimeout(commit, options.debounceMs);
			} else {
				commit();
			}
		},
		[getValues, onQueryChange, reset],
	);

	useEffect(
		() => () => {
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		},
		[],
	);

	const resetForm = useCallback((nextQuery: TQuery = defaults) => {
		const next = normalizeTablePerPage(nextQuery);
		reset(next as DefaultValues<TQuery>);
		onQueryChange(next);
	}, [defaults, onQueryChange, reset]);

	const revertToCommitted = useCallback(() => {
		reset(queryStateRef.current as DefaultValues<TQuery>);
	}, [reset]);

	const replaceDraft = useCallback((nextQuery: TQuery) => {
		reset(nextQuery as DefaultValues<TQuery>, { keepDirty: false });
	}, [reset]);

	const setBase = useCallback(
		<K extends keyof TableBaseQuery>(
			name: K,
			value: TableBaseQuery[K],
			options?: SetValueConfig,
		) => {
			form.setValue(
				name as unknown as Path<TQuery>,
				value as unknown as PathValue<TQuery, Path<TQuery>>,
				options,
			);
		},
		[form],
	);

	const setField = useCallback(
		<K extends keyof TQuery>(name: K, value: TQuery[K], options?: SetValueConfig) => {
			form.setValue(
				name as unknown as Path<TQuery>,
				value as unknown as PathValue<TQuery, Path<TQuery>>,
				options,
			);
		},
		[form],
	);

	const value = useMemo((): TableQueryForm<TQuery> => {
		const { reset: _reset, handleSubmit: _handleSubmit, ...rest } = form;
		void _reset;
		void _handleSubmit;
		return {
			...rest,
			submit,
			resetForm,
			revertToCommitted,
			replaceDraft,
			defaults,
			committed: queryState,
			setBase,
			setField,
		};
	}, [form, submit, resetForm, revertToCommitted, replaceDraft, defaults, queryState, setBase, setField]);

	return (
		<FormProvider {...form}>
			<TableQueryContext.Provider value={value as unknown as TableQueryForm<TableBaseQuery>}>
				{children}
			</TableQueryContext.Provider>
		</FormProvider>
	);
}

export function useTableQuery<TQuery extends TableBaseQuery = TableBaseQuery>(): TableQueryForm<TQuery> {
	const ctx = useContext(TableQueryContext);
	if (!ctx) {
		throw new Error("useTableQuery must be used within TableQueryFormProvider");
	}
	return ctx as unknown as TableQueryForm<TQuery>;
}

