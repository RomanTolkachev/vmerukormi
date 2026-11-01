import {
	createContext,
	useCallback,
	use,
	useMemo,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";

export type TableSelectionApi = {
	toggle: (id: string) => void;
	setSelected: (ids: string[]) => void;
	clear: () => void;
};

export type TableSelectionStats = {
	all: boolean;
	some: boolean;
	none: boolean;
	count: number;
};

type Listener = () => void;

type Store = {
	subscribe: (l: Listener) => () => void;
	getSelectedIds: () => string[];
	isSelected: (id: string) => boolean;
	canSelect: (id: string) => boolean;
	getMaxSelected: () => number | undefined;
	actions: TableSelectionApi;
};

function normalizeMaxSelected(maxSelected?: number): number | undefined {
	if (maxSelected === undefined || !Number.isFinite(maxSelected)) return undefined;
	return Math.max(0, Math.floor(maxSelected));
}

function createSelectionStore(maxSelected?: number): Store {
	let selectedSet = new Set<string>();
	let selectedArr: string[] = [];
	const listeners = new Set<Listener>();
	const selectionLimit = normalizeMaxSelected(maxSelected);

	const notify = () => {
		for (const l of listeners) l();
	};
	const commit = (next: Set<string>) => {
		selectedSet = next;
		selectedArr = Array.from(next);
		notify();
	};

	const subscribe: Store["subscribe"] = listener => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};

	const actions: TableSelectionApi = {
		toggle: id => {
			const next = new Set(selectedSet);
			if (next.has(id)) next.delete(id);
			else {
				if (selectionLimit !== undefined && next.size >= selectionLimit) return;
				next.add(id);
			}
			commit(next);
		},
		setSelected: ids => {
			const uniqueIds = Array.from(new Set(ids));
			const limitedIds =
				selectionLimit === undefined ? uniqueIds : uniqueIds.slice(0, selectionLimit);
			commit(new Set(limitedIds));
		},
		clear: () => {
			if (selectedSet.size === 0) return;
			commit(new Set());
		},
	};

	return {
		subscribe,
		getSelectedIds: () => selectedArr,
		isSelected: id => selectedSet.has(id),
		canSelect: id =>
			selectedSet.has(id) ||
			selectionLimit === undefined ||
			selectedSet.size < selectionLimit,
		getMaxSelected: () => selectionLimit,
		actions,
	};
}

const TableSelectionContext = createContext<Store | null>(null);

export function TableSelectionProvider({
	children,
	maxSelected,
}: {
	children: ReactNode;
	maxSelected?: number;
}) {
	const [store] = useState(() => createSelectionStore(maxSelected));

	return (
		<TableSelectionContext.Provider value={store}>
			{children}
		</TableSelectionContext.Provider>
	);
}

function useStore(): Store {
	const ctx = use(TableSelectionContext);
	if (!ctx) {
		throw new Error("Selection-хуки доступны только внутри UniversalTable с rowSelection.enabled");
	}
	return ctx;
}

export type TableSelection = {
	/** Массив выделенных id (реактивный). */
	selectedIds: readonly string[];
	/** Количество выделенных строк. */
	count: number;
	/** Выделена ли строка (актуально в рамках подписанного компонента). */
	isSelected: (id: string) => boolean;
	/** Переключить выделение строки. */
	toggle: (id: string) => void;
	/** Задать выделение списком id. */
	setSelected: (ids: string[]) => void;
	/** Снять всё выделение. */
	clear: () => void;
};

export function useSelection(): TableSelection {
	const store = useStore();
	const { actions } = store;
	const selectedIds = useSyncExternalStore(
		store.subscribe,
		store.getSelectedIds,
		store.getSelectedIds,
	);
	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	return useMemo(
		() => ({
			selectedIds,
			count: selectedIds.length,
			isSelected: (id: string) => selectedSet.has(id),
			toggle: actions.toggle,
			setSelected: actions.setSelected,
			clear: actions.clear,
		}),
		[selectedIds, selectedSet, actions],
	);
}

export function useTableSelection(): TableSelectionApi {
	return useStore().actions;
}

export function useSelectedIds(): readonly string[] {
	const store = useStore();
	return useSyncExternalStore(store.subscribe, store.getSelectedIds, store.getSelectedIds);
}

export function useIsRowSelected(id: string): boolean {
	const store = useStore();
	const getSnapshot = useCallback(() => store.isSelected(id), [store, id]);
	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useIsRowSelectionDisabled(id: string): boolean {
	const store = useStore();
	const getSnapshot = useCallback(() => !store.canSelect(id), [store, id]);
	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useSelectionLimit(): number | undefined {
	return useStore().getMaxSelected();
}

export function useSelectionStats(rowIds: readonly string[]): TableSelectionStats {
	const ids = useSelectedIds();
	return useMemo(() => {
		if (rowIds.length === 0) return { all: false, some: false, none: true, count: 0 };
		const set = new Set(ids);
		let count = 0;
		for (const id of rowIds) if (set.has(id)) count++;
		return {
			all: count === rowIds.length,
			some: count > 0 && count < rowIds.length,
			none: count === 0,
			count,
		};
	}, [ids, rowIds]);
}

