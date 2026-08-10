import { apiFetch } from "@/shared/api/http";

export async function deleteCustomer(id: string) {
  const response = await apiFetch(`/api/workspace/customers/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить клиента");
}
