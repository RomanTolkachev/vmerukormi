"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout as logoutRequest } from "../api/logout";
import { ui } from "@/shared/ui/styles";
import { Button } from "@/shared/ui/controls";

export function AccountMenu({ username }: { username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await logoutRequest();
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return <div className={ui("accountMenu")}>
    <span className={ui("accountAvatar")} aria-hidden="true">{username.slice(0, 1).toLocaleUpperCase("ru")}</span>
    <span>{username}</span>
    <Button type="button" onClick={logout} disabled={pending}>{pending ? "Выходим…" : "Выйти"}</Button>
  </div>;
}
