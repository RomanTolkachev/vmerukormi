import type { CalculationHistoryItem } from "@/entities/calculation/model/types";
import { requestJson } from "@/shared/api/http";

export function getCalculations(signal?: AbortSignal) {
  return requestJson<CalculationHistoryItem[]>("/api/calculations", { signal });
}
