import { apiFetch } from "@/shared/api/http";

export async function logout() {
  const response = await apiFetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Не удалось выйти");
}
