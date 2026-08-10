import { DashboardPage } from "./_lib/render-pages";

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ petId?: string | string[] }> }) {
  const petId = (await searchParams).petId;
  return <DashboardPage tab="calc" selectedPetId={typeof petId === "string" ? petId : undefined} />;
}

