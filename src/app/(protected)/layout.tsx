import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { AppShell } from "@/shared/ui/app-shell";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell username={user.username}>{children}</AppShell>;
}

