import { redirect } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { LoginForm } from "@/features/auth";
import { ui } from "@/shared/ui/styles";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return <main className={ui("loginPage")}>
    <section className={ui("loginCard")}>
      <div className={ui("loginBrand")}><div className={ui("brandMark")}>✦</div><div className={ui("brand")}>VetEnergy<small>защищённый доступ</small></div></div>
      <div className={ui("loginHeading")}><h1>Вход</h1><p>Введите данные своей учётной записи.</p></div>
      <LoginForm />
    </section>
  </main>;
}
