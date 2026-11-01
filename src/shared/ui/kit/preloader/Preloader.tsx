import React from "react";
import styles from "@/shared/ui/kit/preloader/Preloader.module.css";

interface PreloaderProps {
	size?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9| 10;
}

export const Preloader = ({ size = 4 }: PreloaderProps) => {
	return (
		<div className={styles.wrapper}>
			<div
				style={{ height: `var(--spacing-${size})` }}
				className={`${styles.rotate_infinite} ${styles.preloader}`}></div>
		</div>
	);
};

