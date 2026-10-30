import type { Pet } from "@/entities/pet";
import { requestJson } from "@/shared/api";

export function updatePetCustomer(petId: string, customerId: string | null) {
  return requestJson<Pet>(`/api/pets/${petId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  });
}

