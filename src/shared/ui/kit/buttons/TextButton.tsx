import React from "react";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { textButtonTypography } from "@/shared/ui/kit/buttons/textButtonTypography";
import styles from "@/shared/ui/kit/buttons/TextButton.module.css" with { type: "css" };

export type TextButtonSize = keyof typeof textButtonTypography;
/** @deprecated Use size="sm" with an explicit visual variant (usually "ghost"). */
export type DeprecatedCompactButtonVariant = "compact";
export type TextButtonVariant = "warning" | "ghost" | DeprecatedCompactButtonVariant;

export interface TextButtonProps extends Omit<React.ComponentPropsWithRef<"button">, "color"> {
	howerEffect?: boolean;
	touchEffect?: boolean;
	/** "compact" is deprecated; its legacy surface/geometry remain, with body3 typography. */
	variant?: TextButtonVariant;
	/** Independent of variant. Defaults to "md"; legacy compact keeps its size unless explicitly set. */
	size?: TextButtonSize;
}

export const TextButton = ({
	className = "",
	children,
	onClick,
	onMouseDown,
	onMouseUp,
	onMouseEnter,
	onMouseLeave,
	onTouchStart,
	onTouchEnd,
	howerEffect,
	touchEffect = false,
	variant,
	size,
	type,
	style,
	ref,
	...rest
}: TextButtonProps) => {
	const [pressed, setPressed] = React.useState(false);

	const variableStyle = touchEffect ? { ["--button-scale" as string]: pressed ? 0.97 : 1 } : undefined;
	const sizeClassName = size ? styles[size] : "";
	const variantClassName = variant === "warning"
		? styles.warning
		: variant === "ghost"
			? styles.ghost
			: variant === "compact"
				? styles.compact
				: "";

	return (
		<Typography
			component="button"
			variant={textButtonTypography[size ?? (variant === "compact" ? "sm" : "md")]}
			color="inherit"
			ref={ref}
			type={type ?? "button"}
			className={`${styles.button} ${variantClassName} ${sizeClassName} ${howerEffect ? styles.howerEffect : ""} ${className}`.trim()}
			style={{ ...style, ...variableStyle }}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={e => {
				if (touchEffect) setPressed(false);
				onMouseLeave?.(e);
			}}
			onMouseDown={e => {
				if (touchEffect) setPressed(true);
				onMouseDown?.(e);
			}}
			onMouseUp={e => {
				if (touchEffect) setPressed(false);
				onMouseUp?.(e);
			}}
			onTouchStart={e => {
				if (touchEffect) setPressed(true);
				onTouchStart?.(e);
			}}
			onTouchEnd={e => {
				if (touchEffect) setPressed(false);
				onTouchEnd?.(e);
			}}
			{...rest}>
			{children}
		</Typography>
	);
};

TextButton.displayName = "TextButton";

