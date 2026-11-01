import { useContext } from "react";
import { ThemeContext, type Design } from "@/shared/ui/kit/theme/desktop/Provider";

/** Effective design, including the temporary manual override. */
export function useDesign(): Design {
	return useContext(ThemeContext)?.design ?? "regular";
}

