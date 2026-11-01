import { useEffect, useId, useSyncExternalStore } from "react";

export const MODAL_BASE_Z_INDEX = 10_000;
export const MODAL_Z_INDEX_STEP = 50;

let stack: readonly string[] = [];
const serverStack: readonly string[] = [];
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) {
		listener();
	}
}

export function subscribeModalStack(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getModalStackSnapshot() {
	return stack;
}

export function pushModalStack(id: string) {
	if (stack.includes(id)) return;
	stack = [...stack, id];
	emit();
}

export function popModalStack(id: string) {
	const next = stack.filter(entry => entry !== id);
	if (next.length === stack.length) return;
	stack = next;
	emit();
}

export function getModalZIndex(level: number) {
	return MODAL_BASE_Z_INDEX + level * MODAL_Z_INDEX_STEP;
}

export type ModalStackState = {
	/** Позиция в стеке открытых модалок (с нуля). `-1`, если модалка закрыта. */
	level: number;
	/** Текущая модалка находится поверх остальных и может обрабатывать закрытие. */
	isTop: boolean;
	/** z-index оверлея для текущего уровня стека или `undefined`, если закрыта. */
	zIndex: number | undefined;
};

/**
 * Регистрирует оверлей в глобальном стеке z-index модалок, пока `isOpen === true`.
 *
 * Используйте в **собственных** реализациях модалок (свой portal/overlay), чтобы они
 * корректно наслаивались поверх {@link Modal} и друг друга.
 *
 * Для SelectInput, TimeInput и других floating-полей внутри кастомной модалки
 * оберните контент в {@link FloatingPortalContainerProvider} с ref на host-элемент
 * (см. реализацию в {@link Modal}).
 *
 * @example Кастомный оверлей со стеком
 * ```tsx
 * import { createPortal } from "react-dom";
 * import { useModalStack } from "@shared/modal";
 *
 * function CustomDialog({ isOpen, onClose, children }) {
 *   const { zIndex } = useModalStack(isOpen);
 *   if (!isOpen || zIndex == null) return null;
 *
 *   return createPortal(
 *     <div className="overlay" style={{ zIndex }} onClick={onClose}>
 *       <div onClick={event => event.stopPropagation()}>{children}</div>
 *     </div>,
 *     document.body,
 *   );
 * }
 * ```
 */
export function useModalStack(isOpen: boolean): ModalStackState {
	const modalId = useId();
	const currentStack = useSyncExternalStore(subscribeModalStack, getModalStackSnapshot, () => serverStack);
	const level = isOpen ? currentStack.indexOf(modalId) : -1;

	useEffect(() => {
		if (!isOpen) return;
		pushModalStack(modalId);
		return () => popModalStack(modalId);
	}, [isOpen, modalId]);

	return {
		level,
		isTop: level >= 0 && level === currentStack.length - 1,
		zIndex: level >= 0 ? getModalZIndex(level) : undefined,
	};
}

