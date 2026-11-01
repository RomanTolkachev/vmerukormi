import { useId as useReactId } from "react";

export default function useId(idOverride?: string): string {
	const generatedId = useReactId();
	return idOverride ?? generatedId.replace(/:/g, "");
}

