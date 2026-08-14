import { notFound } from "next/navigation";
import { getFormulaModuleDetails } from "@backend/application/modules/queries";
import { FormulaModulePage } from "@/widgets/modules/ui/formula-module-page";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getFormulaModuleDetails(id);
  if (!data) notFound();
  return <FormulaModulePage module={data.module} canEdit={data.user?.role === "ADMIN"} />;
}
