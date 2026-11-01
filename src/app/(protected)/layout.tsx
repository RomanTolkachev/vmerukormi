import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { AppShell } from "@/app/ui/app-shell";
import { EntityCreationProvider } from "@/features/create-entity";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <EntityCreationProvider isAdmin={user.role === "ADMIN"}><AppShell username={user.username}>{children}</AppShell></EntityCreationProvider>;
}

