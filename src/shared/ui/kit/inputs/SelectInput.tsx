import type { InputSize } from "@/shared/ui/kit/inputs/inputSize";
import {
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useState,
	type CSSProperties,
	type InputHTMLAttributes,
} from "react";
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { RiArrowDownSLine, RiCloseLine } from "@remixicon/react";
import { FloatingPortal } from "@/shared/ui/kit/floating-portal/FloatingPortal";
import { useFloatingPortalRect } from "@/shared/ui/kit/floating-portal/useFloatingPortalRect";
import styles from "@/shared/ui/kit/inputs/SelectInput.module.css";
import { createFilterOptions } from "@/shared/ui/kit/inputs/createFilterOptions";
import { getDropdownPlacement, type SelectDropdownPosition } from "@/shared/ui/kit/inputs/dropdownPlacement";
import { FieldLayoutControlIdContext } from "@/shared/ui/kit/inputs/FieldLayout";
import useAutocomplete from "@/shared/ui/kit/inputs/useAutocomplete";

export interface SelectOption {
	value: string;
	label: string;
	search_data?: string | null;
}

export type { SelectDropdownPosition } from "@/shared/ui/kit/inputs/dropdownPlacement";

export interface SelectInputProps {
	"aria-label"?: string;
	options: SelectOption[];
	placeholder?: string;
	value?: string;
	onChange?: (value: string) => void;
	onBlur?: () => void;
	name?: string;
	id?: string;
	disabled?: boolean;
	isError?: boolean;
	searchable?: boolean;
	/** Показывать кнопку очистки. По умолчанию true. */
	clearable?: boolean;
	emptySearchOnOpen?: boolean;
	exact?: boolean;
	emptyLabel?: string;
	style?: CSSProperties;
	dropdownPosition?: SelectDropdownPosition;
	size?: InputSize;
}

const EMPTY_OPTION_VALUE = "__select_empty__";

function optionToString(option: SelectOption): string {
	return `${option.label} ${option.search_data ?? ""}`.trim();
}

function mapExternalValue(value: string | undefined, options: SelectOption[], emptyLabel?: string, exact = true): SelectOption | null {
	if (value == null || value === "") {
		return emptyLabel ? { value: EMPTY_OPTION_VALUE, label: emptyLabel } : null;
	}
	const existingOption = options.find(option => String(option.value) === String(value));
	if (existingOption) {
		return existingOption;
	}
	return exact ? null : { value, label: value };
}

function mapInternalValue(option: SelectOption | string | null): string {
	if (typeof option === "string") {
		return option;
	}
	if (option == null || option.value === EMPTY_OPTION_VALUE) {
		return "";
	}
	return option.value;
}

type DropdownPortalProps = {
	anchorEl: HTMLElement | null;
	open: boolean;
	dropdownPosition?: SelectDropdownPosition;
	children: React.ReactNode;
};

function DropdownPortal({ anchorEl, open, dropdownPosition, children }: DropdownPortalProps) {
	const [rect, setRect] = useState<DOMRect | null>(null);
	const portalRect = useFloatingPortalRect(open);

	const update = useCallback(() => {
		if (!anchorEl) return;
		setRect(anchorEl.getBoundingClientRect());
	}, [anchorEl]);

	useLayoutEffect(() => {
		if (!open || !anchorEl) {
			return;
		}
		const frame = requestAnimationFrame(update);
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, { passive: true, capture: true });
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, { capture: true });
		};
	}, [anchorEl, open, update]);

	if (!open || typeof document === "undefined" || !rect) {
		return null;
	}

	const { style, maxHeight } = getDropdownPlacement(rect, dropdownPosition, portalRect);
	if (maxHeight <= 0) {
		return null;
	}

	return (
		<FloatingPortal className={styles.dropdownPortal} style={{ ...style, maxHeight }}>
			{children}
		</FloatingPortal>
	);
}

export function SelectInput({
	"aria-label": ariaLabel,
	options,
	placeholder,
	value = "",
	onChange,
	onBlur,
	name,
	id: idProp,
	disabled = false,
	isError,
	searchable = false,
	clearable = true,
	emptySearchOnOpen = false,
	exact = true,
	emptyLabel,
	style,
	dropdownPosition,
	size = "md",
}: SelectInputProps) {
	const layoutControlId = useContext(FieldLayoutControlIdContext);
	const controlId = idProp ?? layoutControlId ?? undefined;
	const isSmall = size === "sm";

	const listOptions = useMemo(() => {
		const base = [...options];
		if (emptyLabel) {
			base.unshift({ value: EMPTY_OPTION_VALUE, label: emptyLabel });
		}
		return base;
	}, [emptyLabel, options]);

	const selectedOption = useMemo(
		() => mapExternalValue(value, listOptions, emptyLabel, exact),
		[value, listOptions, emptyLabel, exact],
	);

	const filterOptions = useMemo(
		() =>
			createFilterOptions<SelectOption>({
				stringify: optionToString,
				matchFrom: "any",
			}),
		[],
	);

	const {
		getRootProps,
		getInputProps,
		getClearProps,
		getPopupIndicatorProps,
		getListboxProps,
		getOptionProps,
		popupOpen,
		dirty,
		setAnchorEl,
		anchorEl,
		filteredOptions,
	} = useAutocomplete<SelectOption>({
		id: controlId,
		options: listOptions,
		value: selectedOption,
		disabled,
		freeSolo: searchable && !exact,
		readOnly: false,
		disableClearable: !clearable,
		clearOnBlur: exact,
		clearOnEscape: true,
		openOnFocus: false,
		selectOnFocus: false,
		blurOnSelect: "touch",
		autoHighlight: false,
		autoSelect: false,
		filterOptions,
		getOptionLabel: option => option.label,
		isOptionEqualToValue: (option, current) => option.value === current.value,
		onChange: (_event, newValue) => {
			onChange?.(mapInternalValue(newValue));
		},
		onClose: (_event, reason) => {
			if (reason === "blur" || reason === "selectOption" || reason === "toggleInput" || reason === "escape") {
				onBlur?.();
			}
		},
		onInputChange: (_event, inputValue, reason) => {
			if (emptySearchOnOpen && reason === "reset" && inputValue !== "") {
				return;
			}
		},
	});

	const clearProps = getClearProps();
	const popupIndicatorProps = getPopupIndicatorProps();

	const inputProps = getInputProps({
		"aria-label": ariaLabel,
		name,
		placeholder,
		className: `${styles.selectInput} ${!popupOpen ? styles.selectInputClosed : ""}`.trim(),
		inputMode: popupOpen ? "text" : "none",
		readOnly: !searchable || !popupOpen,
	}) as InputHTMLAttributes<HTMLInputElement>;

	const listboxProps = getListboxProps({
		className: `${styles.dropdownList} ${styles.dropdownScroll}`,
	});

	return (
		<div className={styles.outer} style={style}>
			<div
				{...getRootProps({
					ref: setAnchorEl,
					className: [
						styles.selectWrapper,
						isSmall ? styles.sm : "",
						popupOpen ? styles.open : "",
						isError ? styles.error : "",
						disabled ? styles.disabled : "",
					].filter(Boolean).join(" "),
					"data-disabled": disabled || undefined,
				})}
			>
				<div className={`${styles.selectTrigger} ${styles.selectTriggerSearchable}`}>
					<input {...inputProps} />
					{clearable && dirty && !disabled ? (
						<IconButton
							asSpan
							size="md"
							variant="transparent"
							wrapperClassName={`${styles.clearBtn} ${isSmall ? styles.smClearBtn : ""}`.trim()}
							buttonClassName={`${styles.clearBtnInner} ${isSmall ? styles.smClearBtnInner : ""}`.trim()}
							icon={<RiCloseLine />}
							aria-label="Очистить"
							tabIndex={clearProps.tabIndex}
							onMouseDown={event => event.preventDefault()}
							onClick={clearProps.onClick}
						/>
					) : null}
					<IconButton
						asSpan
						size="md"
						variant="transparent"
						wrapperClassName={`${styles.btn} ${styles.btnClickable} ${isSmall ? styles.smBtn : ""}`.trim()}
						buttonClassName={isSmall ? styles.smBtnInner : undefined}
						icon={<RiArrowDownSLine />}
						iconClassName={styles.icon}
						tabIndex={popupIndicatorProps.tabIndex}
						onMouseDown={event => event.preventDefault()}
						onClick={popupIndicatorProps.onClick}
					/>
				</div>
			</div>

			<DropdownPortal anchorEl={anchorEl} open={popupOpen} dropdownPosition={dropdownPosition}>
				<div className={styles.dropdownScrollMask}>
					<ul {...listboxProps}>
						{filteredOptions.length === 0 ? (
							<li className={styles.emptyOption}>Ничего не найдено</li>
						) : (
							filteredOptions.map((option, index) => {
								const { key: optionKey, ...optionProps } = getOptionProps({ option, index });
								const selected =
									String(option.value) === String(value) ||
									(value === "" && option.value === EMPTY_OPTION_VALUE);
								return (
									<li
										key={optionKey}
										{...optionProps}
										className={`${styles.option} ${selected ? styles.optionSelected : ""}`.trim()}
									>
										{option.label}
									</li>
								);
							})
						)}
					</ul>
				</div>
			</DropdownPortal>
		</div>
	);
}

