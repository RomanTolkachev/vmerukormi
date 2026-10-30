import { notFound } from "next/navigation";
import { getRationEditorData } from "@backend/application/rations/queries";
import { RationEditor } from "@/_pages/rations";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRationEditorData(id);
  if (!data) notFound();
  return <RationEditor initialRation={data.ration} products={data.products} customers={data.customers} pets={data.pets} calculations={data.calculations} nutrients={data.nutrients} />;
}
