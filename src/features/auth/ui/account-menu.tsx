"use client";

import { useState } from "react";
import { useNavigationRouter as useRouter } from "@/shared/lib/navigation";
import { logout as logoutRequest } from "../api/logout";
import { ui } from "@/shared/ui/styles";
import { Button } from "@/shared/ui/controls";
import { notify } from "@/shared/ui/notifications";

export function AccountMenu({ username }: { username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await logoutRequest();
      router.replace("/login");
      router.refresh();
    } catch {
      notify.error("Не удалось выйти. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <div className={ui("accountMenu")}>
    <span className={ui("accountAvatar")} aria-hidden="true">{username.slice(0, 1).toLocaleUpperCase("ru")}</span>
    <span>{username}</span>
    <Button type="button" onClick={logout} loading={pending}>{pending ? "Выходим…" : "Выйти"}</Button>
  </div>;
}
