import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

export function useFloatingAnchorRect(
	anchorRef: RefObject<HTMLElement | null>,
	active: boolean,
): DOMRect | null {
	const [rect, setRect] = useState<DOMRect | null>(null);

	const update = useCallback(() => {
		requestAnimationFrame(() => {
			if (anchorRef.current) {
				setRect(anchorRef.current.getBoundingClientRect());
			}
		});
	}, [anchorRef]);

	useLayoutEffect(() => {
		if (!active) {
			return;
		}

		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, { passive: true, capture: true });

		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, { capture: true } as EventListenerOptions);
		};
	}, [active, update]);

	return active ? rect : null;
}

