import { apiFetch, requestJson } from "@/shared/api";
import type { RationItem } from "@/entities/ration";

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
