"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout as logoutRequest } from "../api/logout";
import { ui } from "@/shared/ui/styles";

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
    <span>{username}</span>
    <button type="button" onClick={logout} disabled={pending}>{pending ? "Выходим…" : "Выйти"}</button>
  </div>;
}
