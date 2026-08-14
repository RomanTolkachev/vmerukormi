"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui } from "@/shared/ui/styles/ui";

const pages = [
  ["/", "Расчёт"],
  ["/pets", "Питомцы"],
  ["/history", "История"],
  ["/modules", "Формулы"],
  ["/standards", "Эталоны"],
  ["/info", "Справка"],
  ["/customers", "Клиенты"],
  ["/products", "Продукты"],
  ["/nutrients", "Нутриенты"],
  ["/rations", "Рационы"],
  ["/notifications", "События"],
  ["/invoices", "Покупки"],
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return <nav className={ui("tabs", "appTabs")} aria-label="Разделы приложения">
    {pages.map(([href, label]) => <Link
      key={href}
      className={ui("tab", isActive(href) && "active")}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
    >{label}</Link>)}
  </nav>;
}
