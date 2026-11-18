import { redirect } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { RegisterForm } from "@/features/auth";
import { Brand } from "@/shared/ui/brand";
import { ui } from "@/shared/ui/styles";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return <main className={ui("loginPage")}><section className={ui("loginCard")}>
    <div className={ui("loginBrand")}><Brand /></div>
    <div className={ui("loginHeading")}><h1>Регистрация</h1><p>Создайте личный кабинет для работы с рационами.</p></div>
    <RegisterForm />
  </section></main>;
}
