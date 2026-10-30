import type { BreedStandardsValue } from "@/entities/standard";
import { requestJson } from "@/shared/api";

export function updateBreedStandards(value: BreedStandardsValue) {
  return requestJson<{ ok: true }>(`/api/standards/${value.breed.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      standards: value.standards.map((standard) => ({
        ...standard,
        nutrients: standard.nutrients
          .filter((item) => item.amountPer1000Kcal !== null)
          .map((item) => ({ nutrientId: item.nutrientId, amountPer1000Kcal: item.amountPer1000Kcal })),
      })),
    }),
  });
}
