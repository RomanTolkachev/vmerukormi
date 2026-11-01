import type { CSSProperties } from "react";
import type { UniversalTableSizeTokens } from "@/shared/ui/kit/universal-table/types";

const TOKEN_CSS_VARS = {
	textXs: "--table-text-xs",
	textXsLineHeight: "--table-text-xs-line-height",
	spacing1: "--table-spacing-1",
	spacing2: "--table-spacing-2",
	spacing4: "--table-spacing-4",
	spacing8: "--table-spacing-8",
} as const satisfies Record<keyof UniversalTableSizeTokens, string>;

export function toTableSizeStyle(
	tokens?: UniversalTableSizeTokens,
): CSSProperties | undefined {
	if (!tokens) return undefined;

	const style: Record<string, string> = {};

	for (const key of Object.keys(TOKEN_CSS_VARS) as (keyof UniversalTableSizeTokens)[]) {
		const value = tokens[key];
		if (value != null) {
			style[TOKEN_CSS_VARS[key]] = value;
		}
	}

	return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined;
}

