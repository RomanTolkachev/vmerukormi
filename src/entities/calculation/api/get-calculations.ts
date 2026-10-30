import type { CalculationHistoryItem } from "../model/calculation";
import { requestJson } from "@/shared/api";

export function getCalculations(signal?: AbortSignal) {
  return requestJson<CalculationHistoryItem[]>("/api/calculations", { signal });
}
