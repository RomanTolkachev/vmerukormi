import { MODULES } from "@backend/domain/nutrition/modules";
import { FORMULA_OPEN_END } from "@backend/domain/nutrition/formula-versions";
import { getActiveCalculationModules } from "@backend/application/modules/queries";
import { Dashboard, type DashboardTab } from "@/widgets/dashboard/ui/dashboard";
import { Workspace, type WorkspaceTab } from "@/widgets/workspace/ui/workspace";

export async function DashboardPage({ tab, selectedPetId, selectedCustomerId }: { tab: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  const stored = await getActiveCalculationModules();
  const modules = stored.length ? stored : MODULES.map((item) => ({ ...item, techBegin: "2000-01-01", techEnd: FORMULA_OPEN_END }));
  return <Dashboard initialModules={modules} initialTab={tab} selectedPetId={selectedPetId} selectedCustomerId={selectedCustomerId} />;
}

export function WorkspacePage({ tab }: { tab: WorkspaceTab }) {
  return <Workspace tab={tab} />;
}
