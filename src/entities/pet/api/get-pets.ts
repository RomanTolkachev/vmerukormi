import type { Pet } from "@/entities/pet/model/types";
import { requestJson } from "@/shared/api/http";

export function getPets(signal?: AbortSignal) {
  return requestJson<Pet[]>("/api/pets", { signal });
}
