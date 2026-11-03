import { notFound } from "next/navigation";
import { getPetCard } from "@backend/application/pets/queries";
import { PetCard } from "@/_pages/pets";

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await getPetCard(id);
  if (!pet) notFound();
  return <PetCard key={pet.id} initialPet={pet} />;
}
