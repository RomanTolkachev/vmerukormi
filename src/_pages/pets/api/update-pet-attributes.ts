import type { Pet } from "@/entities/pet";
import { requestJson } from "@/shared/api";
import { petAttributesPayload, type PetAttributesDraft } from "../model/pet-attributes";

export function updatePetAttributes(petId: string, draft: PetAttributesDraft) {
  return requestJson<Pet>(`/api/pets/${petId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(petAttributesPayload(draft)),
  });
}
