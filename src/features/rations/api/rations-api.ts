import { apiFetch, requestJson } from "@/shared/api/http";
import type { RationItem, RationMode } from "@/entities/ration/model/types";

export type RationInput = {
  name: string;
  petId: string | null;
  mode: RationMode;
  targetEnergy?: number;
  note: string | null;
};

export function createRation(input: RationInput) {
  return requestJson<{ id: string }>("/api/rations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateRation(id: string, input: Partial<RationInput>) {
  return requestJson<{ id: string }>(`/api/rations/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteRation(id: string) {
  const response = await apiFetch(`/api/rations/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить рацион");
}

export function addRationItem(
  rationId: string,
  input: { productId: string; measureId: string | null; quantity: number; day: number },
) {
  return requestJson<RationItem>(`/api/rations/${rationId}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateRationItem(
  rationId: string,
  itemId: string,
  input: Partial<{
    measureId: string | null;
    quantity: number;
    day: number;
    enabled: boolean;
  }>,
) {
  return requestJson<RationItem>(`/api/rations/${rationId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteRationItem(rationId: string, itemId: string) {
  const response = await apiFetch(`/api/rations/${rationId}/items/${itemId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Не удалось удалить продукт");
}
