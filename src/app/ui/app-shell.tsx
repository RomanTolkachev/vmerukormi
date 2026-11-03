import type { ReactNode } from "react";
import { AccountMenu } from "@/features/auth";
import Link from "next/link";
import { AppNavigation, AppBreadcrumb, MobileNavigation } from "@/app/ui/app-navigation";
import { Brand } from "@/shared/ui/brand";
import { ui } from "@/shared/ui/styles";

export function AppShell({ children, username }: { children: ReactNode; username: string }) {
  return <main className={ui("shell")}>
    <a className={ui("skipLink")} href="#main-content">Перейти к содержимому</a>
    <aside className={ui("sidebar")}>
      <Link href="/" className={ui("brandLink")} aria-label="VetEnergy — расчёт рациона"><Brand /></Link>
      <AppNavigation />
    </aside>
    <div className={ui("shellWorkspace")}>
      <header className={ui("topbar")}><MobileNavigation /><AppBreadcrumb /><AccountMenu username={username} /></header>
      <div className={ui("content")} id="main-content" tabIndex={-1}><div className={ui("pageViewport")}>{children}</div></div>
    </div>
  </main>;
}
