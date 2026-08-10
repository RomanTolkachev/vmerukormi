import { getRationsPageData } from "@backend/application/rations/queries";
import { RationsPage } from "@/widgets/rations/ui/rations-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ petId?: string }>;
}) {
  const [{ petId }, data] = await Promise.all([searchParams, getRationsPageData()]);
  return <RationsPage {...data} selectedPetId={petId} />;
}
