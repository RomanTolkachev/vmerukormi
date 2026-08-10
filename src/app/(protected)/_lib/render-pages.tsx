import { MODULES } from "@backend/domain/nutrition/modules";
import { Dashboard, type DashboardTab } from "@/widgets/dashboard/ui/dashboard";
import { Workspace, type WorkspaceTab } from "@/widgets/workspace/ui/workspace";

export function DashboardPage({ tab, selectedPetId, selectedCustomerId }: { tab: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  return <Dashboard initialModules={MODULES.map((item) => ({ ...item }))} initialTab={tab} selectedPetId={selectedPetId} selectedCustomerId={selectedCustomerId} />;
}

export function WorkspacePage({ tab }: { tab: WorkspaceTab }) {
  return <Workspace tab={tab} />;
}
