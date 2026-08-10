import { apiFetch, requestJson } from "@/shared/api/http";
import type { EditableProduct, ProductNutrientValue } from "../model/types";

export type ProductUpdate = Omit<EditableProduct, "id" | "nutrients">;

export function updateProduct(id: string, input: ProductUpdate) {
  return requestJson<EditableProduct>(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function addProductNutrient(productId: string, nutrientId: string, amount: number) {
  return requestJson<ProductNutrientValue>(`/api/products/${productId}/nutrients`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nutrientId, amount }),
  });
}

export function updateProductNutrient(productId: string, nutrientId: string, amount: number) {
  return requestJson<ProductNutrientValue>(`/api/products/${productId}/nutrients/${nutrientId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount }),
  });
}

export async function deleteProductNutrient(productId: string, nutrientId: string) {
  const response = await apiFetch(`/api/products/${productId}/nutrients/${nutrientId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить нутриент");
}
