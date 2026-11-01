/**
 * Ported from MUI useAutocomplete (MIT License), simplified for single-select.
 * @see https://github.com/mui/material-ui/blob/master/packages/mui-material/src/useAutocomplete/useAutocomplete.js
 */

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type Ref,
	type SyntheticEvent,
} from "react";
import contains from "@/shared/ui/kit/inputs/mui-utils/contains";
import setRef from "@/shared/ui/kit/inputs/mui-utils/setRef";
import useControlled from "@/shared/ui/kit/inputs/mui-utils/useControlled";
import useEventCallback from "@/shared/ui/kit/inputs/mui-utils/useEventCallback";
import useId from "@/shared/ui/kit/inputs/mui-utils/useId";
import { defaultFilterOptions, type FilterOptionsState } from "@/shared/ui/kit/inputs/createFilterOptions";

const pageSize = 5;

export type AutocompleteCloseReason =
	| "toggleInput"
	| "escape"
	| "selectOption"
	| "removeOption"
	| "blur"
	| "createOption"
	| "clear";

export type AutocompleteChangeReason = AutocompleteCloseReason;

type HighlightReason = "keyboard" | "mouse" | "touch" | null;

function getInputValue<Option>(
	value: Option | null,
	getOptionLabel: (option: Option) => string,
): string {
	if (value == null) {
		return "";
	}
	return getOptionLabel(value);
}

const defaultIsActiveElementInListbox = (listboxRef: React.RefObject<HTMLElement | null>) =>
	listboxRef.current !== null && contains(listboxRef.current.parentElement, document.activeElement);

export type UseAutocompleteProps<Option> = {
	options: Option[];
	value?: Option | null;
	defaultValue?: Option | null;
	inputValue?: string;
	onChange?: (
		event: SyntheticEvent | null,
		value: Option | null,
		reason: AutocompleteChangeReason,
	) => void;
	onInputChange?: (event: SyntheticEvent | null, value: string, reason: string) => void;
	onOpen?: (event: SyntheticEvent) => void;
	onClose?: (event: SyntheticEvent | null, reason: AutocompleteCloseReason) => void;
	onHighlightChange?: (
		event: SyntheticEvent | null,
		option: Option | null,
		reason: HighlightReason,
	) => void;
	open?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	freeSolo?: boolean;
	disableClearable?: boolean;
	autoHighlight?: boolean;
	autoSelect?: boolean;
	clearOnBlur?: boolean;
	clearOnEscape?: boolean;
	openOnFocus?: boolean;
	selectOnFocus?: boolean;
	blurOnSelect?: boolean | "mouse" | "touch";
	filterOptions?: (options: Option[], state: FilterOptionsState<Option>) => Option[];
	getOptionLabel?: (option: Option) => string;
	getOptionDisabled?: (option: Option) => boolean;
	getOptionKey?: (option: Option) => string | number;
	isOptionEqualToValue?: (option: Option, value: Option) => boolean;
	id?: string;
	unstable_classNamePrefix?: string;
	unstable_isActiveElementInListbox?: typeof defaultIsActiveElementInListbox;
};

export function useAutocomplete<Option>(props: UseAutocompleteProps<Option>) {
	const {
		unstable_isActiveElementInListbox = defaultIsActiveElementInListbox,
		unstable_classNamePrefix = "Mui",
		autoHighlight = false,
		autoSelect = false,
		blurOnSelect = false,
		clearOnBlur = !props.freeSolo,
		clearOnEscape = false,
		defaultValue = null,
		disableClearable = false,
		disabled: disabledProp = false,
		filterOptions = defaultFilterOptions as (options: Option[], state: FilterOptionsState<Option>) => Option[],
		freeSolo = false,
		getOptionDisabled,
		getOptionKey,
		getOptionLabel: getOptionLabelProp = (option: Option) =>
			(option as { label?: string }).label ?? String(option),
		id: idProp,
		inputValue: inputValueProp,
		isOptionEqualToValue = (option, value) => option === value,
		onChange,
		onClose,
		onHighlightChange,
		onInputChange,
		onOpen,
		open: openProp,
		openOnFocus = false,
		options,
		readOnly = false,
		selectOnFocus = !freeSolo,
		value: valueProp,
	} = props;

	const id = useId(idProp);
	const getOptionLabel = useCallback(
		(option: Option) => {
			const label = getOptionLabelProp(option);
			return typeof label === "string" ? label : String(label);
		},
		[getOptionLabelProp],
	);

	const ignoreFocus = useRef(false);
	const firstFocus = useRef(true);
	const inputRef = useRef<HTMLInputElement>(null);
	const listboxRef = useRef<HTMLElement | null>(null);
	const windowLostFocus = useRef(false);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const defaultHighlighted = autoHighlight ? 0 : -1;
	const highlightedIndexRef = useRef(defaultHighlighted);
	const highlightReasonRef = useRef<HighlightReason>(null);
	const touchScrolledRef = useRef(false);
	const isTouchRef = useRef(false);

	const [initialInputValue] = useState(() => getInputValue(defaultValue ?? valueProp ?? null, getOptionLabel));

	const [value, setValueState] = useControlled<Option | null>({
		controlled: valueProp,
		default: defaultValue ?? null,
		name: "useAutocomplete",
	});

	const [inputValue, setInputValueState] = useControlled<string>({
		controlled: inputValueProp,
		default: initialInputValue,
		name: "useAutocomplete",
		state: "inputValue",
	});

	const [focused, setFocused] = useState(false);
	const [open, setOpenState] = useControlled<boolean>({
		controlled: openProp,
		default: false,
		name: "useAutocomplete",
		state: "open",
	});
	const [inputPristine, setInputPristine] = useState(true);

	const inputValueIsSelectedValue = value != null && inputValue === getOptionLabel(value);
	const popupOpen = open && !readOnly;

	const filteredOptions = useMemo(() => popupOpen
		? filterOptions(options, {
				inputValue: inputValueIsSelectedValue && inputPristine ? "" : inputValue,
				getOptionLabel,
			})
		: [], [popupOpen, filterOptions, options, inputValueIsSelectedValue, inputPristine, inputValue, getOptionLabel]);

	const previousValueRef = useRef(value);

	const resetInputValue = useCallback(
		(event: SyntheticEvent | null, newValue: Option | null, reason: string) => {
			const isOptionSelected = newValue !== null;
			const shouldClearOnReset = reason === "reset" && freeSolo && newValue === null;
			if (!isOptionSelected && !clearOnBlur && !shouldClearOnReset) {
				return;
			}
			const newInputValue = getInputValue(newValue, getOptionLabel);
			if (inputValue === newInputValue) {
				return;
			}
			setInputValueState(newInputValue);
			onInputChange?.(event, newInputValue, reason);
		},
		[clearOnBlur, freeSolo, getOptionLabel, inputValue, onInputChange, setInputValueState],
	);

	useEffect(() => {
		const previousValue = previousValueRef.current;
		previousValueRef.current = value;
		const valueChange = value !== previousValue;
		if (focused && !valueChange) {
			return;
		}
		const shouldSkipFreeSoloReset =
			freeSolo && (!valueChange || (value == null && previousValue === undefined));
		if (shouldSkipFreeSoloReset) {
			return;
		}
		resetInputValue(null, value, "reset");
	}, [focused, freeSolo, resetInputValue, value]);

	const listboxAvailable = open && filteredOptions.length > 0 && !readOnly;

	const syncHighlightedIndexToDOM = useEventCallback(
		({ index, reason, preserveScroll = false }: { index: number; reason: HighlightReason; preserveScroll?: boolean }) => {
			if (inputRef.current == null && listboxRef.current == null) {
				return;
			}

			if (index === -1) {
				inputRef.current?.removeAttribute("aria-activedescendant");
			} else {
				inputRef.current?.setAttribute("aria-activedescendant", `${id}-option-${index}`);
			}

			if (!listboxRef.current) {
				return;
			}

			const prev = listboxRef.current.querySelector(`[role="option"].${unstable_classNamePrefix}-focused`);
			prev?.classList.remove(`${unstable_classNamePrefix}-focused`);
			prev?.classList.remove(`${unstable_classNamePrefix}-focusVisible`);

			let listboxNode = listboxRef.current;
			if (listboxRef.current.getAttribute("role") !== "listbox") {
				listboxNode = listboxRef.current.parentElement?.querySelector('[role="listbox"]') ?? listboxRef.current;
			}

			if (index === -1) {
				if (!preserveScroll) {
					listboxNode.scrollTop = 0;
				}
				return;
			}

			const option = listboxRef.current.querySelector(`[data-option-index="${index}"]`);
			if (!option) {
				return;
			}

			option.classList.add(`${unstable_classNamePrefix}-focused`);
			if (reason === "keyboard") {
				option.classList.add(`${unstable_classNamePrefix}-focusVisible`);
			}

			if (
				listboxNode.scrollHeight > listboxNode.clientHeight &&
				reason !== "mouse" &&
				reason !== "touch"
			) {
				const element = option as HTMLElement;
				const scrollBottom = listboxNode.clientHeight + listboxNode.scrollTop;
				const elementBottom = element.offsetTop + element.offsetHeight;
				if (elementBottom > scrollBottom) {
					listboxNode.scrollTop = elementBottom - listboxNode.clientHeight;
				} else if (element.offsetTop < listboxNode.scrollTop) {
					listboxNode.scrollTop = element.offsetTop;
				}
			}
		},
	);

	const setHighlightedIndex = useEventCallback(
		({
			event,
			index,
			reason,
			preserveScroll = false,
		}: {
			event: SyntheticEvent | null;
			index: number;
			reason: HighlightReason;
			preserveScroll?: boolean;
		}) => {
			highlightedIndexRef.current = index;
			highlightReasonRef.current = reason;
			if (onHighlightChange && reason && ["mouse", "keyboard", "touch"].includes(reason)) {
				onHighlightChange(event, index === -1 ? null : filteredOptions[index], reason);
			}
			syncHighlightedIndexToDOM({ index, reason, preserveScroll });
		},
	);

	const validOptionIndex = useCallback(
		(index: number, direction: "next" | "previous") => {
			if (!listboxRef.current || index < 0 || index >= filteredOptions.length) {
				return -1;
			}
			let nextFocus = index;
			while (true) {
				const option = listboxRef.current.querySelector(
					`[data-option-index="${nextFocus}"]`,
				) as HTMLElement | null;
				const nextFocusDisabled =
					!option || option.getAttribute("aria-disabled") === "true" || !!getOptionDisabled?.(filteredOptions[nextFocus]);
				if (option && !nextFocusDisabled) {
					return nextFocus;
				}
				nextFocus = direction === "next" ? (nextFocus + 1) % filteredOptions.length : (nextFocus - 1 + filteredOptions.length) % filteredOptions.length;
				if (nextFocus === index) {
					return -1;
				}
			}
		},
		[filteredOptions, getOptionDisabled],
	);

	const changeHighlightedIndex = useEventCallback(
		({
			event,
			diff,
			direction = "next",
			reason,
			preserveScroll,
		}: {
			event: SyntheticEvent | null;
			diff: number | "reset" | "start" | "end";
			direction?: "next" | "previous";
			reason: HighlightReason;
			preserveScroll?: boolean;
		}) => {
			if (!popupOpen) {
				return;
			}
			if (reason === "keyboard") {
				touchScrolledRef.current = false;
				isTouchRef.current = false;
			}

			const getNextIndex = () => {
				const maxIndex = filteredOptions.length - 1;
				if (diff === "reset") return defaultHighlighted;
				if (diff === "start") return 0;
				if (diff === "end") return maxIndex;
				const newIndex = highlightedIndexRef.current + (typeof diff === "number" ? diff : 0);
				if (newIndex < 0) return maxIndex;
				if (newIndex > maxIndex) return 0;
				return newIndex;
			};

			const nextIndex = validOptionIndex(getNextIndex(), direction);
			setHighlightedIndex({ index: nextIndex, reason, event, preserveScroll });
		},
	);

	const syncHighlightedIndex = useCallback(() => {
		if (!popupOpen) {
			return;
		}
		if (filteredOptions.length === 0 || value == null) {
			changeHighlightedIndex({ diff: "reset", reason: null, event: null });
			return;
		}
		const itemIndex = filteredOptions.findIndex(optionItem => isOptionEqualToValue(optionItem, value));
		if (itemIndex === -1) {
			changeHighlightedIndex({ diff: "reset", reason: null, event: null });
		} else {
			setHighlightedIndex({ index: itemIndex, reason: null, event: null });
		}
	}, [changeHighlightedIndex, filteredOptions, isOptionEqualToValue, popupOpen, setHighlightedIndex, value]);

	const handleListboxRef = useEventCallback((node: HTMLElement | null) => {
		setRef(listboxRef as Ref<HTMLElement | null>, node);
		if (node) {
			syncHighlightedIndex();
		}
	});

	useEffect(() => {
		syncHighlightedIndex();
	}, [filteredOptions.length, popupOpen, syncHighlightedIndex]);

	useEffect(() => {
		const handleWindowBlur = () => {
			windowLostFocus.current = true;
		};
		window.addEventListener("blur", handleWindowBlur);
		return () => window.removeEventListener("blur", handleWindowBlur);
	}, []);

	const handleOpen = (event: SyntheticEvent) => {
		if (open) return;
		setOpenState(true);
		setInputPristine(true);
		isTouchRef.current = false;
		onOpen?.(event);
	};

	const handleClose = (event: SyntheticEvent | null, reason: AutocompleteCloseReason) => {
		if (!open) return;
		setOpenState(false);
		touchScrolledRef.current = false;
		highlightReasonRef.current = null;
		onClose?.(event, reason);
	};

	const handleValue = (event: SyntheticEvent | null, newValue: Option | null, reason: AutocompleteChangeReason) => {
		if (value === newValue) {
			return;
		}
		onChange?.(event, newValue, reason);
		setValueState(newValue);
	};

	const selectNewValue = (
		event: SyntheticEvent,
		option: Option | string,
		reasonProp: AutocompleteChangeReason = "selectOption",
		origin: "options" | "freeSolo" = "options",
	) => {
		let reason = reasonProp;
		let newValue: Option | null = typeof option === "string" ? null : option;

		if (freeSolo && typeof option === "string") {
			newValue = option as unknown as Option;
			reason = "createOption";
			void origin;
		}

		resetInputValue(event, newValue, reason);
		handleValue(event, newValue, reason);
		handleClose(event, reason);

		if (
			blurOnSelect === true ||
			(blurOnSelect === "touch" && isTouchRef.current) ||
			(blurOnSelect === "mouse" && !isTouchRef.current)
		) {
			inputRef.current?.blur();
		}
	};

	const handleClear = (event: SyntheticEvent) => {
		setInputValueState("");
		onInputChange?.(event, "", "clear");
		handleValue(event, null, "clear");
	};

	const handlePopupIndicator = (event: SyntheticEvent) => {
		if (open) {
			handleClose(event, "toggleInput");
		} else {
			handleOpen(event);
		}
	};

	const handleOptionMouseMove = (event: SyntheticEvent) => {
		const index = Number((event.currentTarget as HTMLElement).getAttribute("data-option-index"));
		if (highlightedIndexRef.current !== index) {
			setHighlightedIndex({ event, index, reason: "mouse" });
		} else {
			highlightReasonRef.current = "mouse";
		}
		if (!isTouchRef.current) {
			touchScrolledRef.current = false;
		}
	};

	const handleOptionTouchStart = (event: SyntheticEvent) => {
		touchScrolledRef.current = false;
		setHighlightedIndex({
			event,
			index: Number((event.currentTarget as HTMLElement).getAttribute("data-option-index")),
			reason: "touch",
		});
		isTouchRef.current = true;
	};

	const handleOptionClick = (event: SyntheticEvent) => {
		const index = Number((event.currentTarget as HTMLElement).getAttribute("data-option-index"));
		selectNewValue(event, filteredOptions[index], "selectOption");
		isTouchRef.current = false;
	};

	const handleMouseDown = (event: React.MouseEvent) => {
		if (!contains(event.currentTarget as Element, event.target as Node)) {
			return;
		}
		if (anchorEl && !contains(anchorEl, event.target as Node)) {
			return;
		}
		if ((event.target as HTMLElement).getAttribute("id") !== id) {
			event.preventDefault();
		}
	};

	const handleClick = (event: React.MouseEvent) => {
		if (!contains(event.currentTarget as Element, event.target as Node)) {
			return;
		}
		if (anchorEl && !contains(anchorEl, event.target as Node)) {
			return;
		}
		inputRef.current?.focus();
		if (
			selectOnFocus &&
			firstFocus.current &&
			inputRef.current &&
			(inputRef.current.selectionEnd ?? 0) - (inputRef.current.selectionStart ?? 0) === 0
		) {
			inputRef.current.select();
		}
		firstFocus.current = false;
	};

	const handleInputMouseDown = (event: React.MouseEvent) => {
		if (!disabledProp && (inputValue === "" || !open) && event.button === 0) {
			handlePopupIndicator(event);
		}
	};

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.value;
		const valueChanged = inputValue !== newValue;
		if (valueChanged) {
			setInputValueState(newValue);
			touchScrolledRef.current = false;
			onInputChange?.(event, newValue, "input");
		}
		if (newValue === "") {
			if (!disableClearable && !freeSolo) {
				handleValue(event, null, "clear");
			}
		} else {
			handleOpen(event);
		}
		if (valueChanged) {
			setInputPristine(false);
		}
	};

	const handleFocus = (event: React.FocusEvent) => {
		setFocused(true);
		if (windowLostFocus.current) {
			windowLostFocus.current = false;
			return;
		}
		if (openOnFocus && !ignoreFocus.current) {
			handleOpen(event);
		}
	};

	const handleBlur = (event: React.FocusEvent) => {
		if (unstable_isActiveElementInListbox(listboxRef)) {
			inputRef.current?.focus();
			return;
		}

		setFocused(false);
		firstFocus.current = true;
		ignoreFocus.current = false;

		if (
			autoSelect &&
			highlightedIndexRef.current !== -1 &&
			popupOpen &&
			highlightReasonRef.current !== "mouse" &&
			highlightReasonRef.current !== "touch"
		) {
			selectNewValue(event, filteredOptions[highlightedIndexRef.current], "blur");
		} else if (autoSelect && freeSolo && inputValue !== "") {
			selectNewValue(event, inputValue, "blur", "freeSolo");
		} else if (clearOnBlur) {
			resetInputValue(event, value, "blur");
		}

		handleClose(event, "blur");
	};

	const handleKeyDown =
		(other: { onKeyDown?: (event: React.KeyboardEvent) => void }) => (event: React.KeyboardEvent) => {
			other.onKeyDown?.(event);
			if ((event as unknown as { defaultMuiPrevented?: boolean }).defaultMuiPrevented) {
				return;
			}

			if (event.key === "ArrowDown") {
				event.preventDefault();
				changeHighlightedIndex({ diff: 1, direction: "next", reason: "keyboard", event });
				handleOpen(event);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				changeHighlightedIndex({ diff: -1, direction: "previous", reason: "keyboard", event });
				handleOpen(event);
			} else if (event.key === "Enter") {
				if (
					highlightedIndexRef.current !== -1 &&
					popupOpen &&
					!touchScrolledRef.current
				) {
					event.preventDefault();
					const option = filteredOptions[highlightedIndexRef.current];
					if (!getOptionDisabled?.(option)) {
						selectNewValue(event, option, "selectOption");
					}
				} else if (freeSolo && inputValue !== "" && !inputValueIsSelectedValue) {
					event.preventDefault();
					selectNewValue(event, inputValue, "createOption", "freeSolo");
				} else if (popupOpen && touchScrolledRef.current) {
					event.preventDefault();
					handleClose(event, "escape");
				}
			} else if (event.key === "Escape") {
				if (popupOpen) {
					event.preventDefault();
					event.stopPropagation();
					handleClose(event, "escape");
				} else if (clearOnEscape && inputValue !== "") {
					event.preventDefault();
					event.stopPropagation();
					handleClear(event);
				}
			} else if (event.key === "Home") {
				event.preventDefault();
				changeHighlightedIndex({ diff: "start", direction: "next", reason: "keyboard", event });
			} else if (event.key === "End") {
				event.preventDefault();
				changeHighlightedIndex({ diff: "end", direction: "previous", reason: "keyboard", event });
			} else if (event.key === "PageUp") {
				event.preventDefault();
				changeHighlightedIndex({ diff: -pageSize, direction: "previous", reason: "keyboard", event });
				handleOpen(event);
			} else if (event.key === "PageDown") {
				event.preventDefault();
				changeHighlightedIndex({ diff: pageSize, direction: "next", reason: "keyboard", event });
				handleOpen(event);
			}
		};

	const dirty = freeSolo && inputValue.length > 0 ? true : value != null;

	return {
		getRootProps: (other: Record<string, unknown> = {}) => ({
			...other,
			onKeyDown: handleKeyDown(other as { onKeyDown?: (event: React.KeyboardEvent) => void }),
			onMouseDown: handleMouseDown,
			onClick: handleClick,
		}),
		getInputProps: (other: Record<string, unknown> = {}) => ({
			id,
			value: inputValue,
			onBlur: handleBlur,
			onFocus: handleFocus,
			onChange: handleInputChange,
			onMouseDown: handleInputMouseDown,
			"aria-activedescendant": popupOpen ? undefined : undefined,
			"aria-autocomplete": "list",
			"aria-controls": listboxAvailable ? `${id}-listbox` : undefined,
			"aria-expanded": listboxAvailable,
			autoComplete: "off",
			ref: inputRef,
			autoCapitalize: "none",
			spellCheck: false,
			role: "combobox",
			disabled: disabledProp,
			...other,
		}),
		getClearProps: () => ({
			tabIndex: -1,
			type: "button" as const,
			onClick: (event: React.MouseEvent) => {
				ignoreFocus.current = true;
				handleClear(event);
			},
		}),
		getPopupIndicatorProps: () => ({
			tabIndex: -1,
			type: "button" as const,
			onClick: handlePopupIndicator,
		}),
		getListboxProps: (other: Record<string, unknown> = {}) => ({
			...other,
			role: "listbox",
			id: `${id}-listbox`,
			"aria-labelledby": `${id}-label`,
			ref: handleListboxRef,
			onMouseDown: (event: React.MouseEvent) => {
				(other.onMouseDown as ((event: React.MouseEvent) => void) | undefined)?.(event);
				event.preventDefault();
			},
			onScroll: () => {
				if (isTouchRef.current) {
					touchScrolledRef.current = true;
				}
			},
		}),
		getOptionProps: ({ index, option }: { index: number; option: Option }) => {
			const selected = value != null && isOptionEqualToValue(option, value);
			const optionDisabled = getOptionDisabled?.(option) ?? false;
			return {
				key: getOptionKey?.(option) ?? getOptionLabel(option),
				tabIndex: -1,
				role: "option",
				id: `${id}-option-${index}`,
				onMouseMove: handleOptionMouseMove,
				onClick: handleOptionClick,
				onTouchStart: handleOptionTouchStart,
				"data-option-index": index,
				"aria-disabled": optionDisabled,
				"aria-selected": selected,
			};
		},
		id,
		inputValue,
		value,
		dirty,
		popupOpen,
		focused,
		anchorEl,
		setAnchorEl,
		filteredOptions,
	};
}

export default useAutocomplete;

