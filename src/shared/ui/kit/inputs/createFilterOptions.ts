/**
 * Ported from MUI useAutocomplete/createFilterOptions (MIT License).
 * @see https://github.com/mui/material-ui/blob/master/packages/mui-material/src/useAutocomplete/useAutocomplete.js
 */

export type FilterOptionsState<Option> = {
	inputValue: string;
	getOptionLabel: (option: Option) => string;
};

export type CreateFilterOptionsConfig<Option> = {
	ignoreAccents?: boolean;
	ignoreCase?: boolean;
	limit?: number;
	matchFrom?: "any" | "start";
	stringify?: (option: Option) => string;
	trim?: boolean;
};

function stripDiacritics(string: string): string {
	return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function createFilterOptions<Option>(config: CreateFilterOptionsConfig<Option> = {}) {
	const {
		ignoreAccents = true,
		ignoreCase = true,
		limit,
		matchFrom = "any",
		stringify,
		trim = false,
	} = config;

	return (options: Option[], state: FilterOptionsState<Option>) => {
		let input = trim ? state.inputValue.trim() : state.inputValue;
		if (ignoreCase) {
			input = input.toLowerCase();
		}
		if (ignoreAccents) {
			input = stripDiacritics(input);
		}

		const filteredOptions =
			input === ""
				? options
				: options.filter(option => {
						let candidate = (stringify ?? state.getOptionLabel)(option);
						if (ignoreCase) {
							candidate = candidate.toLowerCase();
						}
						if (ignoreAccents) {
							candidate = stripDiacritics(candidate);
						}
						return matchFrom === "start" ? candidate.startsWith(input) : candidate.includes(input);
					});

		return typeof limit === "number" ? filteredOptions.slice(0, limit) : filteredOptions;
	};
}

export const defaultFilterOptions = createFilterOptions();

