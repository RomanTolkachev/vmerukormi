import type { CSSProperties } from "react";

/** Фиксирует ширину flex-ячейки строки — без сжатия и без пустого gap в конце. */
export function getCellSizeStyle(size: number): CSSProperties {
	return {
		width: size,
		flexGrow: 0,
		flexShrink: 0,
		flexBasis: `${size}px`,
	};
}

