"use client";

import type { ReactNode } from "react";
import { useNavigationPending } from "@/shared/lib/navigation";
import { BusyRegion } from "@/shared/ui/loading";
import { ui } from "@/shared/ui/styles";

export function WorkspaceContent({ children }: { children: ReactNode }) {
  const pending = useNavigationPending();
  return <BusyRegion className={ui("content")} id="main-content" tabIndex={-1} busy={pending} label="Открываем страницу…">
    <div className={ui("pageViewport")}>{children}</div>
  </BusyRegion>;
}
