import type { Breed, Species } from "@/entities/breed/@x/pet";
import type { CustomerOption } from "@/entities/customer/@x/pet";

export type Sex = "MALE" | "FEMALE";

export type Pet = {
  id: string;
  name: string;
  species: Species;
  sex: Sex | null;
  breedId: string | null;
  breed: Breed | null;
  customerId: string | null;
  customer: CustomerOption | null;
  actualWeight: number;
  idealWeight: number;
  bcs: number;
};

export type PetDraft = {
  name: string;
  species: Species;
  breedId: string;
  customerId: string;
  sex: Sex | "";
  actualWeight: number;
  idealWeight: number;
  bcs: number;
};
