import { useCallback, useLayoutEffect, useState } from "react";
import { useFloatingPortalContainer } from "@/shared/ui/kit/floating-portal/FloatingPortalContext";

export function useFloatingPortalRect(active: boolean): DOMRect | null {
	const container = useFloatingPortalContainer();
	const [rect, setRect] = useState<DOMRect | null>(null);

	const update = useCallback(() => {
		setRect(container ? container.getBoundingClientRect() : null);
	}, [container]);

	useLayoutEffect(() => {
		if (!active || !container) {
			return;
		}

		const frame = requestAnimationFrame(update);
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, { passive: true, capture: true });

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, { capture: true });
		};
	}, [active, container, update]);

	return active && container ? rect : null;
}

