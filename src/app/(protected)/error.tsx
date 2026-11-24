"use client";

import { Button } from "@/shared/ui/controls";
import { ui } from "@/shared/ui/styles";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return <section className={ui("card")}><div className={ui("cardBody")}>
    <h1>Не удалось загрузить страницу</h1>
    <p role="alert">Попробуйте ещё раз или выберите другой раздел в меню.</p>
    <Button onClick={retry}>Повторить</Button>
  </div></section>;
}
