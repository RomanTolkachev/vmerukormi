import { redirect } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { LoginForm } from "@/features/auth";
import { ui } from "@/shared/ui/styles";
import { Brand } from "@/shared/ui/brand";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return <main className={ui("loginPage")}>
    <section className={ui("loginCard")}>
      <div className={ui("loginBrand")}><Brand /></div>
      <div className={ui("loginHeading")}><h1>Вход</h1><p>Введите данные своей учётной записи.</p></div>
      <LoginForm />
    </section>
  </main>;
}
