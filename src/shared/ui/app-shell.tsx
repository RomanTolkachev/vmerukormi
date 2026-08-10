import type { ReactNode } from "react";
import { AccountMenu } from "@/shared/ui/account-menu";
import { AppNavigation } from "@/shared/ui/app-navigation";
import { ui } from "@/shared/ui/styles/ui";

export function AppShell({ children, username }: { children: ReactNode; username: string }) {
  return <main className={ui("shell")}>
    <header className={ui("topbar")}>
      <div className={ui("brandMark")}>✦</div>
      <div className={ui("brand")}>VetEnergy<small>локальный расчёт рационов</small></div>
      <AccountMenu username={username} />
    </header>
    <div className={ui("content")}>
      <AppNavigation />
      <div className={ui("pageViewport")}>{children}</div>
    </div>
  </main>;
}
