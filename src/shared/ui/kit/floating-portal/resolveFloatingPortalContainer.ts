import { UZGSM_FLOATING_PORTAL_ID } from "@/shared/ui/kit/floating-portal/constants";

export function resolveFloatingPortalContainer(contextContainer?: HTMLElement | null): HTMLElement {
	if (typeof document === "undefined") {
		return null as unknown as HTMLElement;
	}

	if (contextContainer) {
		return contextContainer;
	}

	const libraryRoot = document.getElementById(UZGSM_FLOATING_PORTAL_ID);
	if (libraryRoot) {
		return libraryRoot;
	}

	return document.body;
}

