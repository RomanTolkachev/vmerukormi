import { DashboardPage } from "../_lib/render-pages";

export default async function PetsPage({ searchParams }: { searchParams: Promise<{ customerId?: string | string[] }> }) {
  const customerId = (await searchParams).customerId;
  return <DashboardPage tab="pets" selectedCustomerId={typeof customerId === "string" ? customerId : undefined} />;
}
