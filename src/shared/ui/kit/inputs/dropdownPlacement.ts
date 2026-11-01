import type { CSSProperties } from "react";

export type SelectDropdownPosition = "bottom" | "top" | "left" | "right";

const VIEWPORT_PADDING = 8;
const GAP_PX = 8;
const PREFERRED_MAX_HEIGHT = 320;

type DropdownPlacement = {
	style: CSSProperties;
	maxHeight: number;
};

type PlacementBoundary = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

function viewportBoundary(): PlacementBoundary {
	return {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight,
		width: window.innerWidth,
		height: window.innerHeight,
	};
}

function normalizeBoundary(containerRect?: DOMRect | null): PlacementBoundary {
	return containerRect
		? {
			left: containerRect.left,
			top: containerRect.top,
			right: containerRect.right,
			bottom: containerRect.bottom,
			width: containerRect.width,
			height: containerRect.height,
		}
		: viewportBoundary();
}

function relativeLeft(rect: DOMRect, boundary: PlacementBoundary): number {
	return rect.left - boundary.left;
}

function relativeTop(rect: DOMRect, boundary: PlacementBoundary): number {
	return rect.top - boundary.top;
}

function relativeRight(rect: DOMRect, boundary: PlacementBoundary): number {
	return boundary.right - rect.left + GAP_PX;
}

function relativeBottom(rect: DOMRect, boundary: PlacementBoundary): number {
	return boundary.bottom - rect.top + GAP_PX;
}

function clampMaxHeight(available: number): number {
	if (available <= 0) {
		return 0;
	}
	return Math.min(PREFERRED_MAX_HEIGHT, available);
}

function resolveVerticalFlip(
	rect: DOMRect,
	boundary: PlacementBoundary,
	forceTop: boolean,
	forceBottom: boolean,
): boolean {
	if (forceTop) return true;
	if (forceBottom) return false;

	const availableBelow = boundary.bottom - rect.bottom - GAP_PX - VIEWPORT_PADDING;
	const availableAbove = rect.top - boundary.top - GAP_PX - VIEWPORT_PADDING;

	if (availableBelow >= PREFERRED_MAX_HEIGHT) {
		return false;
	}

	return availableAbove > availableBelow;
}

export function getDropdownPlacement(
	rect: DOMRect,
	dropdownPosition?: SelectDropdownPosition,
	containerRect?: DOMRect | null,
): DropdownPlacement {
	const boundary = normalizeBoundary(containerRect);

	switch (dropdownPosition) {
		case "left": {
			const available = Math.max(0, boundary.bottom - rect.top - VIEWPORT_PADDING);
			return {
				maxHeight: clampMaxHeight(available),
				style: {
					position: "fixed",
					top: relativeTop(rect, boundary),
					right: relativeRight(rect, boundary),
					minWidth: rect.width,
				},
			};
		}
		case "right": {
			const available = Math.max(0, boundary.bottom - rect.top - VIEWPORT_PADDING);
			return {
				maxHeight: clampMaxHeight(available),
				style: {
					position: "fixed",
					top: relativeTop(rect, boundary),
					left: rect.right - boundary.left + GAP_PX,
					minWidth: rect.width,
				},
			};
		}
		case "top": {
			const available = Math.max(0, rect.top - boundary.top - GAP_PX - VIEWPORT_PADDING);
			return {
				maxHeight: clampMaxHeight(available),
				style: {
					position: "fixed",
					left: relativeLeft(rect, boundary),
					width: rect.width,
					bottom: relativeBottom(rect, boundary),
				},
			};
		}
		case "bottom": {
			const available = Math.max(0, boundary.bottom - rect.bottom - GAP_PX - VIEWPORT_PADDING);
			return {
				maxHeight: clampMaxHeight(available),
				style: {
					position: "fixed",
					top: rect.bottom - boundary.top + GAP_PX,
					left: relativeLeft(rect, boundary),
					width: rect.width,
				},
			};
		}
		default: {
			const openUp = resolveVerticalFlip(rect, boundary, false, false);

			if (openUp) {
				const available = Math.max(0, rect.top - boundary.top - GAP_PX - VIEWPORT_PADDING);
				return {
					maxHeight: clampMaxHeight(available),
					style: {
						position: "fixed",
						left: relativeLeft(rect, boundary),
						width: rect.width,
						bottom: relativeBottom(rect, boundary),
					},
				};
			}

			const available = Math.max(0, boundary.bottom - rect.bottom - GAP_PX - VIEWPORT_PADDING);
			return {
				maxHeight: clampMaxHeight(available),
				style: {
					position: "fixed",
					top: rect.bottom - boundary.top + GAP_PX,
					left: relativeLeft(rect, boundary),
					width: rect.width,
				},
			};
		}
	}
}

