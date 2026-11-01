import type { ReactNode } from "react";
import styles from "@/shared/ui/kit/list/List.module.css";

export type ListProps = {
	className?: string;
	children: ReactNode;
	dense?: boolean;
};

export function List({ className, children, dense = false }: ListProps) {
	return (
		<ul className={[styles.root, dense ? styles.dense : "", className].filter(Boolean).join(" ")}>
			{children}
		</ul>
	);
}


