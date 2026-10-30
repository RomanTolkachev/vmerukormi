import type { Breed } from "../model/breed";
import { requestJson } from "@/shared/api";

export function getBreeds(signal?: AbortSignal) {
  return requestJson<Breed[]>("/api/breeds", { signal });
}
