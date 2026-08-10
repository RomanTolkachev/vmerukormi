"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/shared/api/http";
import { ui } from "@/shared/ui/styles/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error ?? "Не удалось войти");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className={ui("loginForm")}>
    <div className={ui("field")}>
      <label htmlFor="username">Имя пользователя</label>
      <input className={ui("input")} id="username" name="username" autoComplete="username" autoFocus required />
    </div>
    <div className={ui("field")}>
      <label htmlFor="password">Пароль</label>
      <input className={ui("input")} id="password" name="password" type="password" autoComplete="current-password" required />
    </div>
    <button className={ui("primary", "loginButton")} type="submit" disabled={pending}>{pending ? "Вход…" : "Войти"}</button>
    {error && <div className={ui("error")} role="alert">{error}</div>}
  </form>;
}
