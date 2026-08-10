import type { Breed } from "@/entities/breed/model/types";
import { requestJson } from "@/shared/api/http";

export function getBreeds(signal?: AbortSignal) {
  return requestJson<Breed[]>("/api/breeds", { signal });
}
