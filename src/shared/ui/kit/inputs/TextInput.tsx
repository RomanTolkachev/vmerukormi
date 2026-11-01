import type { InputSize } from "@/shared/ui/kit/inputs/inputSize";
import React, { useContext } from "react";
import styles from "@/shared/ui/kit/inputs/TextInput.module.css";
import { FieldLayoutControlIdContext } from "@/shared/ui/kit/inputs/FieldLayout";

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
	isError?: boolean;
	size?: InputSize;
}

export const TextInput = ({ isError, className, id, size = "md", ...props }: TextInputProps) => {
	const layoutControlId = useContext(FieldLayoutControlIdContext);
	const inputId = id ?? layoutControlId;
	const frameClassName = [
		styles.inputFrame,
		isError ? styles.error : "",
		size === "sm" ? styles.sm : "",
	].filter(Boolean).join(" ");

	return (
		<div className={styles.wrapper}>
			<div className={frameClassName}>
				<input
					className={`${styles.inner} ${className || ""}`}
					id={inputId}
					{...props}
				/>
			</div>
		</div>
	);
};

