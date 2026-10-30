import type { Pet, PetDraft } from "@/entities/pet";
import { requestJson } from "@/shared/api";

export function createPet(draft: PetDraft) {
  return requestJson<Pet>("/api/pets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, breedId: draft.breedId || null, customerId: draft.customerId || null, sex: draft.sex || null }),
  });
}
