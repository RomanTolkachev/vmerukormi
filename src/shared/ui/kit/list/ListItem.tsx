import type { ReactNode } from "react";
import styles from "@/shared/ui/kit/list/List.module.css";

export type ListItemProps = {
	className?: string;
	children?: ReactNode;
	disableGutters?: boolean;
	divider?: boolean;
	hoverEffect?: boolean;
	start?: ReactNode;
	secondaryAction?: ReactNode;
};

export function ListItem({
	className,
	children,
	disableGutters = false,
	divider = false,
	hoverEffect = false,
	start,
	secondaryAction,
}: ListItemProps) {
	return (
		<li
			className={[
				styles.item,
				disableGutters ? styles.disableGutters : "",
				divider ? styles.divider : "",
				hoverEffect ? styles.hoverable : "",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{start}
			<div className={styles.content}>{children}</div>
			{secondaryAction ? <div className={styles.secondaryAction}>{secondaryAction}</div> : null}
		</li>
	);
}


