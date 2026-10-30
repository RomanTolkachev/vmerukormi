import type { CustomerOption } from "../model/customer";
import { requestJson } from "@/shared/api";

export function getCustomers(signal?: AbortSignal) {
  return requestJson<CustomerOption[]>("/api/customers", { signal });
}

