import { SelectInput } from "@/shared/ui/kit/inputs/SelectInput";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { getPerPageOptions, type PerPageValue } from "@/shared/ui/kit/universal-table/lib/perPage";
import styles from "@/shared/ui/kit/universal-table/ordered-table/PerPage.module.css";

export { PER_PAGE_OPTIONS, type PerPageValue } from "@/shared/ui/kit/universal-table/lib/perPage";

type PerPageProps = {
	value: number;
	onChange: (value: PerPageValue) => void;
	disabled?: boolean;
};

export function PerPage({ value, onChange, disabled = false }: PerPageProps) {
	return (
		<div className={styles.root}>
			<Typography variant="body3" component="span" className={styles.label}>
				На странице
			</Typography>
			<div className={styles.select}>
				<SelectInput
					aria-label="Строк на странице"
					options={getPerPageOptions()}
					value={String(value)}
					onChange={next => onChange(Number(next))}
					disabled={disabled}
					clearable={false}
					dropdownPosition="top"
				/>
			</div>
		</div>
	);
}

