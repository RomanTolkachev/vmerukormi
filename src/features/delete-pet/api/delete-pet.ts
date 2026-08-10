import { apiFetch } from "@/shared/api/http";

export async function deletePet(id: string) {
  const response = await apiFetch(`/api/pets/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить питомца");
}
