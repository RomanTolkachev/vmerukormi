import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IGNORE_CLICK_OUTSIDE_ATTR } from "@/shared/ui/kit/hooks/useClickOutside";
import { getFloatingSurfaceGlassStyle } from "@/shared/ui/kit/floating-portal/getFloatingSurfaceGlassStyle";
import styles from "@/shared/ui/kit/floating-portal/FloatingPortal.module.css";
import { useFloatingPortalContainer } from "@/shared/ui/kit/floating-portal/FloatingPortalContext";
import { resolveFloatingPortalContainer } from "@/shared/ui/kit/floating-portal/resolveFloatingPortalContainer";

/** z-index поверхности портала; inline, чтобы потребительские классы не перебивали слой. */
const SURFACE_Z_INDEX = 10010;

export type FloatingPortalProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "style"> & {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	/** Apply glass surface styles (default: true). */
	surface?: boolean;
};

export const FloatingPortal = forwardRef<HTMLDivElement, FloatingPortalProps>(function FloatingPortal(
	{ children, className, style, surface = true, ...rest },
	ref,
) {
	const contextContainer = useFloatingPortalContainer();

	if (typeof document === "undefined") {
		return null;
	}

	const container = resolveFloatingPortalContainer(contextContainer);
	const surfaceClassName = surface ? styles.surface : "";
	const mergedClassName = [surfaceClassName, className].filter(Boolean).join(" ");
	const glassStyle = surface ? getFloatingSurfaceGlassStyle() : {};

	return createPortal(
		<div
			ref={ref}
			{...rest}
			{...{ [IGNORE_CLICK_OUTSIDE_ATTR]: "" }}
			className={mergedClassName || undefined}
			style={{
				...glassStyle,
				...style,
				...(surface && style?.zIndex == null ? { zIndex: SURFACE_Z_INDEX } : {}),
			}}
		>
			{children}
		</div>,
		container,
	);
});

