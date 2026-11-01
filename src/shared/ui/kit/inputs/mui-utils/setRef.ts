import type { Ref } from "react";

export default function setRef<T>(ref: Ref<T> | undefined | null, value: T | null): void {
	if (typeof ref === "function") {
		ref(value);
	} else if (ref && typeof ref === "object") {
		(ref as { current: T | null }).current = value;
	}
}

