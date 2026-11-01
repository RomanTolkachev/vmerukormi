import { useEffect } from "react";

/** Маркер портала: клики внутри не считаются «outside» для Modal и др. */
export const IGNORE_CLICK_OUTSIDE_ATTR = "data-ignore-click-outside";
export const IGNORE_CLICK_OUTSIDE_SELECTOR = `[${IGNORE_CLICK_OUTSIDE_ATTR}]`;

export const useClickOutside = (ref: React.RefObject<HTMLElement | null>, callback: () => void, isEnabled: boolean = true, excludeRef?: React.RefObject<HTMLElement | null>) => {
	useEffect(() => {
		if (!isEnabled) return;

		const handleClick = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Element && target.closest(IGNORE_CLICK_OUTSIDE_SELECTOR)) {
				return;
			}

			if (excludeRef?.current && excludeRef.current.contains(target as Node)) {
				return;
			}

			if (ref.current && !ref.current.contains(target as Node)) {
				callback();
			}
		};

		// Capture phase: runs before trigger's pointerdown + preventDefault,
		// so other SelectInputs close when opening a new one.
		document.addEventListener("pointerdown", handleClick, true);
		return () => document.removeEventListener("pointerdown", handleClick, true);
	}, [ref, callback, isEnabled, excludeRef]);
};

