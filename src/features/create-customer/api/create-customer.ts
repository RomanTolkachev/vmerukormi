import { requestJson } from "@/shared/api/http";

export function createCustomer(input: Record<string, FormDataEntryValue>) {
  return requestJson<{ id: string }>("/api/workspace/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: String(input.name ?? ""),
      email: String(input.email ?? ""),
      phone: String(input.phone ?? ""),
      note: String(input.note ?? ""),
    }),
  });
}
