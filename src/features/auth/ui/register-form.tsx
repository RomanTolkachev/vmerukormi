"use client";

import { useState, type FormEvent } from "react";
import { useNavigationPending, useNavigationRouter as useRouter } from "@/shared/lib/navigation";
import { requestJson } from "@/shared/api";
import { Button, ButtonLink, Input } from "@/shared/ui/controls";
import { RequiredMark } from "@/shared/ui/required-mark";
import { Captcha } from "@/shared/ui/captcha";
import { ui } from "@/shared/ui/styles";

export function RegisterForm() {
  const router = useRouter();
  const navigating = useNavigationPending();
  const [captcha, setCaptcha] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || navigating) return;
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmation")) { setError("Пароли не совпадают"); return; }
    setPending(true);
    setError("");
    try {
      await requestJson("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: form.get("name"), email: form.get("email"), password: form.get("password"), captcha,
      }) });
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось зарегистрироваться");
      setCaptcha("");
      setAttempt(value => value + 1);
    } finally { setPending(false); }
  }
  return <form onSubmit={submit} className={ui("loginForm")}>
    <label className={ui("field")}><span>Имя<RequiredMark /></span><Input name="name" autoComplete="name" required maxLength={80} /></label>
    <label className={ui("field")}><span>Email<RequiredMark /></span><Input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label className={ui("field")}><span>Пароль<RequiredMark /></span><Input name="password" type="password" autoComplete="new-password" required minLength={6} maxLength={200} /><small>Не менее 6 символов</small></label>
    <label className={ui("field")}><span>Повторите пароль<RequiredMark /></span><Input name="confirmation" type="password" autoComplete="new-password" required minLength={6} maxLength={200} /></label>
    <Captcha key={attempt} onChange={setCaptcha} />
    {error && <p className={ui("error")} role="alert">{error}</p>}
    <Button type="submit" variant="primary" loading={pending || navigating} disabled={!captcha}>{pending || navigating ? "Создаём аккаунт…" : "Зарегистрироваться"}</Button>
    <ButtonLink href="/login">Уже есть аккаунт — войти</ButtonLink>
  </form>;
}
