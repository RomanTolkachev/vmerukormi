import { apiFetch, requestJson } from "@/shared/api/http";
import type { EditableProduct, ProductMeasureValue, ProductNutrientValue, ProductTagOption } from "../model/types";

export type ProductUpdate = Omit<EditableProduct, "id" | "measures" | "nutrients">;

export function updateProduct(id: string, input: ProductUpdate) {
  return requestJson<EditableProduct>(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function createProductTag(name: string) {
  return requestJson<ProductTagOption>("/api/product-tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
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

export function addProductMeasure(productId: string, name: string, grams: number) {
  return requestJson<ProductMeasureValue>(`/api/products/${productId}/measures`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, grams }),
  });
}

export function updateProductMeasure(productId: string, measureId: string, name: string, grams: number) {
  return requestJson<ProductMeasureValue>(`/api/products/${productId}/measures/${measureId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, grams }),
  });
}

export async function deleteProductMeasure(productId: string, measureId: string) {
  const response = await apiFetch(`/api/products/${productId}/measures/${measureId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить меру");
}
