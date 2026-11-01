import type { CSSProperties } from "react";

export function getFloatingSurfaceGlassStyle(): CSSProperties {
	if (typeof document === "undefined") {
		return {};
	}

	return {
		background: "var(--floating-background)",
		backdropFilter: "var(--floating-backdrop-filter)",
		WebkitBackdropFilter: "var(--floating-backdrop-filter)",
	};
}

