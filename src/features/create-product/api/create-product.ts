import { requestJson } from "@/shared/api";

export function createProduct(input: Record<string, unknown>) {
  return requestJson<{ id: string }>("/api/workspace/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
