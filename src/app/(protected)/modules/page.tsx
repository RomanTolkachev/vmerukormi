import { getFormulaVersionsPageData } from "@backend/application/modules/queries";
import { FormulaVersionsPage } from "@/widgets/modules/ui/formula-versions-page";

export default async function ModulesPage() {
  const data = await getFormulaVersionsPageData();
  return <FormulaVersionsPage versions={data.versions} canEdit={data.user?.role === "ADMIN"} />;
}
