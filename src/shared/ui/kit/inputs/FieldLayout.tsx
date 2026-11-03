import { createContext, useId, type CSSProperties, type FC, type ReactNode } from "react";
import { Typography, type TypographyVariant } from "@/shared/ui/kit/typography/Typography";
import { RequiredMark } from "@/shared/ui/required-mark";
import styles from "@/shared/ui/kit/inputs/FieldLayout.module.css";

/** `id` контрола внутри `FieldLayout` (например, для `<input id>`). */
export const FieldLayoutControlIdContext = createContext<string | undefined>(undefined);

export type LabelPosition = "left" | "right" | "top" | "bottom";
export type TextAlign = "left" | "center" | "right";
export type FontSize = "xs" | "sm" | "base" | "lg" | "xl";

const labelVariants: Record<FontSize, TypographyVariant> = {
	xs: "body3",
	sm: "body3",
	base: "body2",
	lg: "header4",
	xl: "header4",
};

export type LabelSize = number | "auto";

export interface FieldLabelConfig {
	value: ReactNode;
	show?: boolean;
	position?: LabelPosition;
	textPosition?: TextAlign;
	fontSize?: FontSize;
	size?: LabelSize;
}

export type ErrorShow = "always" | "dynamic" | "never";

export interface FieldErrorConfig {
	/** "never" also removes the reserved error row. */
	show?: ErrorShow;
	textPosition?: TextAlign;
}

export interface FieldLayoutProps {
	/**
	 * Backward compatible:
	 * - ReactNode → покажется как раньше (сверху)
	 * - string → label с дефолтами (position bottom)
	 * - FieldLabelConfig → расширенная настройка
	 */
	label?: ReactNode | string | FieldLabelConfig;
	requiredMark?: boolean;
	error?: FieldErrorConfig;
	inputSize?: LabelSize;
	errorMessage?: string;
	style?: CSSProperties;
	children: ReactNode;
}

export const FieldLayout: FC<FieldLayoutProps> = ({
	label,
	requiredMark = false,
	error,
	inputSize,
	errorMessage,
	style,
	children,
}) => {
	const controlId = useId();
	const errorShow = error?.show ?? "dynamic";
	const shouldShowErrorText = errorShow === "always" || (errorShow === "dynamic" && !!errorMessage);

	const labelConfig: FieldLabelConfig | null = (() => {
		if (label == null) return null;
		if (typeof label === "string") {
			return { value: label, show: true, position: "bottom" };
		}
		if (typeof label !== "object" || !("value" in label)) {
			return { value: label, show: true, position: "top" };
		}
		// If config is provided but value is empty/undefined, don't render a label at all.
		if (label.value == null) return null;
		return label.show === false ? null : { position: "bottom", ...label };
	})();

	const labelPosition = labelConfig?.position ?? "top";
	const textPosition = labelConfig?.textPosition ?? "left";
	const errorTextPosition = error?.textPosition ?? "center";
	const labelFontSize = labelConfig?.fontSize ?? "base";

	const renderedLabel = labelConfig ? (
		<Typography
			component="label"
			htmlFor={controlId}
			variant={labelVariants[labelFontSize]}
			align={textPosition}
			className={[
				styles.label,
				labelPosition === "top" ? styles.labelTop : labelPosition === "bottom" ? styles.labelBottom : "",
			].filter(Boolean).join(" ")}
		>
			{labelConfig.value}
			{requiredMark && <RequiredMark />}
		</Typography>
	) : null;

	const rawLabelSize =
		labelConfig?.size ??
		(labelPosition === "left" || labelPosition === "right" ? 0.5 : undefined);
	const labelSize =
		rawLabelSize === "auto"
			? "auto"
			: rawLabelSize != null
				? Math.max(0, Math.min(0.9, rawLabelSize))
				: undefined;

	const processedInputSize =
		inputSize === "auto"
			? "auto"
			: inputSize != null
				? Math.max(0, Math.min(0.9, inputSize))
				: undefined;

	return (
		<div className={styles.wrapper} style={style}>
			{labelPosition === "top" && renderedLabel}

			<div className={styles.fieldAndError}>
				<div
					className={`${styles.content} ${labelPosition === "left" || labelPosition === "right" ? styles.contentHorizontal : ""}`}
					style={
						labelPosition === "left" || labelPosition === "right"
							? (() => {
									const labelColumn =
										labelSize === "auto"
											? "min-content"
											: labelSize != null
												? `minmax(min-content, ${labelSize * 100}%)`
												: "minmax(min-content, 50%)";
									const inputColumn =
										processedInputSize === "auto"
											? "min-content"
											: processedInputSize != null
												? `minmax(50px, ${processedInputSize * 100}%)`
												: "minmax(50px, 1fr)";
									return {
										gridTemplateColumns:
											labelPosition === "left"
												? `${labelColumn} ${inputColumn}`
												: `${inputColumn} ${labelColumn}`,
									};
								})()
							: undefined
					}
				>
					{labelPosition === "left" && renderedLabel}

					<div className={styles.inputContainer}>
						{requiredMark && !renderedLabel ? (
							<Typography component="span" variant="body3" color="danger" className={styles.requiredMark} aria-hidden>
								*
							</Typography>
						) : null}
						<FieldLayoutControlIdContext.Provider value={labelConfig ? controlId : undefined}>
							{children}
						</FieldLayoutControlIdContext.Provider>
					</div>

					{labelPosition === "right" && renderedLabel}
				</div>

				{errorShow !== "never" && <div className={styles.errorContainer} style={{ textAlign: errorTextPosition }}>
					{shouldShowErrorText && errorMessage ? (
						<Typography component="div" variant="body3" color="danger" align={errorTextPosition} className={styles.errorMessage}>
							{errorMessage}
						</Typography>
					) : null}
				</div>}
			</div>

			{labelPosition === "bottom" && renderedLabel}
		</div>
	);
};

FieldLayout.displayName = "FieldLayout";

