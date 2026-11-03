import type { RationDetails } from "@/entities/ration";
import { requestJson } from "@/shared/api";
import { rationFormPayload, type RationFormValues } from "../model/ration-form";

export function saveRation(values: RationFormValues, id?: string) {
  return requestJson<RationDetails>(id ? `/api/rations/${id}` : "/api/rations", {
    method: id ? "PATCH" : "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rationFormPayload(values)),
  });
}
