import type { Pet } from "../model/pet";
import { requestJson } from "@/shared/api";

export function getPets(signal?: AbortSignal) {
  return requestJson<Pet[]>("/api/pets", { signal });
}
