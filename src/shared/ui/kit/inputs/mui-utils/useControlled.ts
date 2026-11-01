import { useCallback, useState } from "react";

type UseControlledProps<T> = {
	controlled: T | undefined;
	default: T;
	name: string;
	state?: string;
};

export default function useControlled<T>({
	controlled,
	default: defaultProp,
}: UseControlledProps<T>): [T, (newValue: T) => void] {
	const [isControlled] = useState(controlled !== undefined);
	const [valueState, setValueState] = useState(defaultProp);
	const value = isControlled ? (controlled as T) : valueState;

	const setValueIfUncontrolled = useCallback((newValue: T) => {
		if (!isControlled) {
			setValueState(newValue);
		}
	}, [isControlled]);

	return [value, setValueIfUncontrolled];
}

