import React from "react";
import { buttonMotionClassName } from "@/shared/ui/button-motion";
import styles from "@/shared/ui/kit/buttons/IconButton.module.css";

interface IconButtonOwnProps {
	icon?: React.ReactNode;
	maxSize?: number;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "ghost" | "transparent";
	/** Стили внешней обёртки (именно она — flex-ребёнок у родителя). */
	wrapperStyle?: React.CSSProperties;
	wrapperClassName?: string;
	buttonClassName?: string;
	iconClassName?: string;
	touchEffect?: boolean;
}

type IconButtonProps = ({ asSpan: true } & IconButtonOwnProps & React.ComponentPropsWithRef<"span">) | ({ asSpan?: false } & IconButtonOwnProps & React.ComponentPropsWithRef<"button">);

export const IconButton = ({
	id,
	icon,
	maxSize = 55,
	size,
	variant = "default",
	wrapperStyle,
	wrapperClassName = "",
	buttonClassName = "",
	iconClassName = "",
	style,
	className,
	children,
	onClick,
	onMouseDown,
	onMouseUp,
	onMouseEnter,
	onMouseLeave,
	onTouchStart,
	onTouchEnd,
	asSpan = false,
	touchEffect = false,
	ref,
	...rest
}: IconButtonProps) => {
	const [pressed, setPressed] = React.useState(false);

	const variableStyle: React.CSSProperties = touchEffect ? { ["--button-scale" as string]: pressed ? 0.97 : 1 } : {};

	const sizeClassName = size ? styles[size] : "";

	const buttonStyles: React.CSSProperties = size
		? {
				color: "var(--button-text)",
				...style,
				...variableStyle
			}
		: {
				maxHeight: `${maxSize}px`,
				color: "var(--button-text)",
				...style,
				...variableStyle
			};

	const wrapperStyles: React.CSSProperties | undefined = size ? undefined : { maxHeight: `${maxSize}px` };

	const pressHandlers = {
		onMouseEnter,
		onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
			if (touchEffect) setPressed(false);
			onMouseLeave?.(e);
		},
		...(touchEffect
			? {
					onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
						setPressed(true);
						onMouseDown?.(e);
					},
					onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
						setPressed(false);
						onMouseUp?.(e);
					},
					onTouchStart: (e: React.TouchEvent<HTMLButtonElement>) => {
						setPressed(true);
						onTouchStart?.(e);
					},
					onTouchEnd: (e: React.TouchEvent<HTMLButtonElement>) => {
						setPressed(false);
						onTouchEnd?.(e);
					}
				}
			: {
					onMouseDown,
					onMouseUp,
					onTouchStart,
					onTouchEnd
				})
	};

	const commonProps = {
		id,
		className: `${buttonMotionClassName} ${styles.button} ${sizeClassName} ${variant === "ghost" ? styles.ghost : variant === "transparent" ? styles.transparent : ""} ${buttonClassName} ${className || ""}`.trim(),
		style: buttonStyles,
		onClick,
		...pressHandlers,
		...rest
	};

	const content = icon !== undefined ? <span className={`${styles.icon} ${iconClassName}`.trim()}>{icon}</span> : children;

	return (
		<div
			className={`${styles.buttonWrapper} ${sizeClassName} ${wrapperClassName}`}
			style={{ ...wrapperStyles, ...wrapperStyle }}
		>
			{asSpan ? (
				<span
					ref={ref as React.Ref<HTMLSpanElement>}
					{...commonProps}
					role="button"
					tabIndex={-1}>
					{content}
				</span>
			) : (
				<button
					ref={ref as React.Ref<HTMLButtonElement>}
					{...commonProps}
					type={("type" in rest ? (rest as React.ComponentPropsWithRef<"button">).type : undefined) ?? "button"}>
					{content}
				</button>
			)}
		</div>
	);
};

IconButton.displayName = "IconButton";

