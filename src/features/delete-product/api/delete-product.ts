import { apiFetch } from "@/shared/api";

export async function deleteProduct(id: string) {
  const response = await apiFetch(`/api/workspace/products/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить продукт");
}
