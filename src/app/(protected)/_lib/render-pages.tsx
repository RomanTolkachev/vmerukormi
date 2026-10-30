import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { readableCatalog } from "@backend/domain/catalog/access";
import { MODULES } from "@backend/domain/nutrition/modules";
import { FORMULA_OPEN_END } from "@backend/domain/nutrition/formula-versions";
import { getActiveCalculationModules } from "@backend/application/modules/queries";
import { Dashboard, type DashboardTab } from "@/_pages/dashboard";
import { Workspace, type WorkspaceTab } from "@/_pages/workspace";

export async function DashboardPage({ tab, selectedPetId, selectedCustomerId }: { tab: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  const stored = await getActiveCalculationModules();
  const modules = stored.length ? stored : MODULES.map((item) => ({ ...item, techBegin: "2000-01-01", techEnd: FORMULA_OPEN_END }));
  return <Dashboard initialModules={modules} initialTab={tab} selectedPetId={selectedPetId} selectedCustomerId={selectedCustomerId} />;
}

export async function WorkspacePage({ tab }: { tab: WorkspaceTab }) {
  const user = await getCurrentUser();
  const tags = user && tab === "products" ? await prisma.productTag.findMany({ where: readableCatalog(user.id), select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
  return <Workspace tab={tab} tags={tags} isAdmin={user?.role === "ADMIN"} />;
}
