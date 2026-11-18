import { notFound } from "next/navigation";
import { getBreedStandards } from "@backend/application/standards/queries";
import { BreedStandardEditor } from "@/features/edit-standard";
import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export default async function BreedStandardPage({ params, searchParams }: { params: Promise<{ breedId: string }>; searchParams: Promise<{ userId?: string }> }) {
  const { breedId } = await params;
  const user = await getCurrentUser();
  const value = await getBreedStandards(breedId, (await searchParams).userId);
  if (!value) notFound();
  const owners = user?.role === "ADMIN" ? await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [];
  return <BreedStandardEditor key={value.userId} initialValue={value} owners={owners} />;
}
