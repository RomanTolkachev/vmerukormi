"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui } from "@/shared/ui/styles/ui";

export function CustomerTabs({ customerId }: { customerId: string }) {
  const pathname = usePathname();
  const pages = [
    [`/customers/${customerId}`, "Питомцы"],
    [`/customers/${customerId}/calculations`, "Расчёты"],
    [`/customers/${customerId}/rations`, "Рационы"],
  ] as const;

  return <nav className={ui("tabs", "customerTabs")} aria-label="Разделы карточки клиента">
    {pages.map(([href, label]) => <Link
      key={href}
      href={href}
      className={ui("tab", pathname === href && "active")}
      aria-current={pathname === href ? "page" : undefined}
    >{label}</Link>)}
  </nav>;
}
