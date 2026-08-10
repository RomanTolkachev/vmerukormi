import type { Pet } from "@/entities/pet/model/types";
import { requestJson } from "@/shared/api/http";

export function updatePetCustomer(petId: string, customerId: string | null) {
  return requestJson<Pet>(`/api/pets/${petId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  });
}

