import { notFound } from "next/navigation";
import { getBreedStandards } from "@backend/application/standards/queries";
import { BreedStandardEditor } from "@/features/edit-standard/ui/breed-standard-editor";

export default async function BreedStandardPage({ params }: { params: Promise<{ breedId: string }> }) {
  const { breedId } = await params;
  const value = await getBreedStandards(breedId);
  if (!value) notFound();
  return <BreedStandardEditor initialValue={value} />;
}
