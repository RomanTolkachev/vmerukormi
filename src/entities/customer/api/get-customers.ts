import type { CustomerOption } from "@/entities/customer/model/types";
import { requestJson } from "@/shared/api/http";

export function getCustomers(signal?: AbortSignal) {
  return requestJson<CustomerOption[]>("/api/customers", { signal });
}

