import { createElement, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from "react";
import styles from "@/shared/ui/kit/typography/Typography.module.css";

export type TypographyVariant = "header1" | "header2" | "header3" | "header4" | "body1" | "body2" | "body3";
export type TypographyColor = "normal" | "muted" | "danger" | "accent" | "inherit";
export type TypographyAlign = "left" | "center" | "right";

type AllowedComponent = "span" | "label" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "code" | "div" | "button" | "a";

const defaultVariantMapping: Record<TypographyVariant, AllowedComponent> = {
	header1: "h1",
	header2: "h2",
	header3: "h3",
	header4: "h4",
	body1: "p",
	body2: "p",
	body3: "p"
};

type TypographyOwnProps<TTag extends AllowedComponent> = {
	variant?: TypographyVariant;
	color?: TypographyColor;
	component?: TTag;
	align?: TypographyAlign;
	noWrap?: boolean;
	gutterBottom?: boolean;
	className?: string;
	style?: CSSProperties;
	children: ReactNode;
};

export type TypographyProps<TTag extends AllowedComponent = "span"> = TypographyOwnProps<TTag> &
	Omit<ComponentPropsWithRef<TTag>, keyof TypographyOwnProps<TTag> | "color">;

function cx(...parts: Array<string | undefined | false>): string {
	return parts.filter(Boolean).join(" ");
}

export function Typography<TTag extends AllowedComponent = "span">(props: TypographyProps<TTag>) {
	const {
		variant = "body2",
		color = "normal",
		component,
		align,
		noWrap,
		gutterBottom,
		className,
		style,
		children,
		...rest
	} = props;

	const Component = component ?? defaultVariantMapping[variant];

	return createElement(Component, {
		...rest,
		className: cx(
			styles.root,
			styles[variant],
			color === "normal" ? styles.colorNormal : undefined,
			color === "muted" ? styles.colorMuted : undefined,
			color === "danger" ? styles.colorDanger : undefined,
			color === "accent" ? styles.colorAccent : undefined,
			align === "left" ? styles.alignLeft : undefined,
			align === "center" ? styles.alignCenter : undefined,
			align === "right" ? styles.alignRight : undefined,
			noWrap && styles.noWrap,
			gutterBottom && styles.gutterBottom,
			className
		),
		style,
	}, children);
}

