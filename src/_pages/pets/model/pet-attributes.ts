import { calculateBcs, type Pet } from "@/entities/pet";

export function petAttributesDraft(pet: Pet) {
  return {
    name: pet.name,
    species: pet.species,
    sex: pet.sex ?? "",
    breedId: pet.breedId ?? "",
    actualWeight: String(pet.actualWeight),
    idealWeight: String(pet.idealWeight),
    bcs: String(pet.bcs),
    note: pet.note ?? "",
  };
}

export type PetAttributesDraft = ReturnType<typeof petAttributesDraft>;

export function changePetWeight(draft: PetAttributesDraft, field: "actualWeight" | "idealWeight", value: string): PetAttributesDraft {
  const next = { ...draft, [field]: value };
  const actualWeight = Number(next.actualWeight);
  const idealWeight = Number(next.idealWeight);
  if (Number.isFinite(actualWeight) && actualWeight > 0 && Number.isFinite(idealWeight) && idealWeight > 0) {
    next.bcs = String(calculateBcs(actualWeight, idealWeight));
  }
  return next;
}

export function petAttributesPayload(draft: PetAttributesDraft) {
  return {
    name: draft.name.trim(),
    species: draft.species,
    sex: draft.sex || null,
    breedId: draft.breedId || null,
    actualWeight: Number(draft.actualWeight),
    idealWeight: Number(draft.idealWeight),
    bcs: Number(draft.bcs),
    note: draft.note.trim() || null,
  };
}
