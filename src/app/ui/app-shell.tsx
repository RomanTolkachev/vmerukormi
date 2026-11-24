import type { ReactNode } from "react";
import { AccountMenu } from "@/features/auth";
import { NavigationLink as Link } from "@/shared/lib/navigation";
import { AppNavigation, AppBreadcrumb, MobileNavigation } from "@/app/ui/app-navigation";
import { Brand } from "@/shared/ui/brand";
import { ui } from "@/shared/ui/styles";
import { WorkspaceContent } from "./workspace-content";

export function AppShell({ children, username, isAdmin = false }: { children: ReactNode; username: string; isAdmin?: boolean }) {
  return <main className={ui("shell")}>
    <a className={ui("skipLink")} href="#main-content">Перейти к содержимому</a>
    <aside className={ui("sidebar")}>
      <Link href="/" className={ui("brandLink")} aria-label="VetEnergy — расчёт рациона"><Brand /></Link>
      <AppNavigation isAdmin={isAdmin} />
    </aside>
    <div className={ui("shellWorkspace")}>
      <header className={ui("topbar")}><MobileNavigation isAdmin={isAdmin} /><AppBreadcrumb /><AccountMenu username={username} /></header>
      <WorkspaceContent>{children}</WorkspaceContent>
    </div>
  </main>;
}
