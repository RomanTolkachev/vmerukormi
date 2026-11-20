import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { readableCatalog } from "@backend/domain/catalog/access";
import { Dashboard, type DashboardTab } from "@/_pages/dashboard";
import { Workspace, type WorkspaceTab } from "@/_pages/workspace";

export async function DashboardPage({ tab, selectedPetId, selectedCustomerId }: { tab: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  return <Dashboard initialTab={tab} selectedPetId={selectedPetId} selectedCustomerId={selectedCustomerId} />;
}

export async function WorkspacePage({ tab }: { tab: WorkspaceTab }) {
  const user = await getCurrentUser();
  const tags = user && (tab === "products" || tab === "recipes") ? await prisma.productTag.findMany({ where: readableCatalog(user), select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
  return <Workspace tab={tab} tags={tags} isAdmin={user?.role === "ADMIN"} />;
}
