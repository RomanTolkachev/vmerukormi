import { getFormulaVersionsPageData } from "@backend/application/modules/queries";
import { FormulaVersionsPage } from "@/_pages/modules";

export default async function ModulesPage() {
  const data = await getFormulaVersionsPageData();
  return <FormulaVersionsPage versions={data.versions} canEdit={data.user?.role === "ADMIN"} />;
}
