import React from 'react';
import styles from "@/shared/ui/kit/inputs/Checkbox.module.css";
import { CheckedIcon } from "@/shared/ui/kit/Icons/CheckedIcon";

type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
	label?: string;
	size?: CheckboxSize;
	hoverEffect?: boolean;
}

const sizeToClassName: Record<CheckboxSize, string> = {
	sm: styles.sizeSm,
	md: styles.sizeMd,
	lg: styles.sizeLg
};

export const Checkbox = ({
	id,
	label,
	className,
	size = "lg",
	hoverEffect = false,
	checked,
	defaultChecked,
	onChange,
	"aria-label": ariaLabel,
	...rest
}: CheckboxProps) => {
	const sizeClassName = sizeToClassName[size as CheckboxSize] ?? styles.sizeLg;
	const wrapperClassName = [styles.wrapper, sizeClassName, className].filter(Boolean).join(" ");
	const isControlled = checked !== undefined;
	const [uncontrolledChecked, setUncontrolledChecked] = React.useState(Boolean(defaultChecked));
	const isChecked = isControlled ? checked === true : uncontrolledChecked;

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!isControlled) {
			setUncontrolledChecked(event.target.checked);
		}
		onChange?.(event);
	};

	return (
		<div className={wrapperClassName}>
			<label
				className={`${styles.label} ${hoverEffect ? styles.labelHoverEffect : ""}`}
				htmlFor={id}>
				<input
					id={id}
					type="checkbox"
					className={styles.input}
					aria-label={ariaLabel ?? label}
					checked={isControlled ? checked : undefined}
					defaultChecked={isControlled ? undefined : defaultChecked}
					onChange={handleChange}
					{...rest}
				/>
				<span className={styles.box}>
					{isChecked ? <CheckedIcon className={styles.checkIcon} /> : null}
				</span>
				{label && <span className={styles.text}>{label}</span>}
			</label>
		</div>
	);
};

export default Checkbox;

