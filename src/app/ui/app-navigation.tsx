"use client";

import { useState } from "react";
import { NavigationLink as Link } from "@/shared/lib/navigation";
import { usePathname } from "next/navigation";
import { Brand } from "@/shared/ui/brand";
import { Button } from "@/shared/ui/controls";
import { Modal } from "@/shared/ui/modal";
import {
  CalculatorIcon, RationIcon, PetIcon, CustomerIcon, ProductIcon, NutrientIcon,
  StandardIcon, FormulaIcon, HistoryIcon, NotificationIcon, HelpIcon, MenuIcon,
} from "@/shared/ui/icons";
import { ui } from "@/shared/ui/styles";

const groups = [
  { title: "Практика", pages: [
    { href: "/", label: "Расчёт", icon: CalculatorIcon },
    { href: "/rations", label: "Рационы", icon: RationIcon },
    { href: "/pets", label: "Питомцы", icon: PetIcon },
    { href: "/customers", label: "Клиенты", icon: CustomerIcon },
  ] },
  { title: "Справочники", pages: [
    { href: "/products", label: "Продукты", icon: ProductIcon },
    { href: "/recipes", label: "Рецепты", icon: RationIcon },
    { href: "/nutrients", label: "Нутриенты", icon: NutrientIcon },
    { href: "/standards", label: "Эталоны", icon: StandardIcon },
    { href: "/modules", label: "Формулы", icon: FormulaIcon },
  ] },
  { title: "Рабочее пространство", pages: [
    { href: "/archive", label: "Удалённые", icon: HistoryIcon },
    { href: "/history", label: "История", icon: HistoryIcon },
    { href: "/notifications", label: "События", icon: NotificationIcon },
    { href: "/info", label: "Справка", icon: HelpIcon },
  ] },
  { title: "Администрирование", admin: true, pages: [
    { href: "/users", label: "Пользователи", icon: CustomerIcon },
    { href: "/audit", label: "Журнал действий", icon: HistoryIcon },
  ] },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function AppNavigation({ onNavigate, isAdmin = false }: { onNavigate?: () => void; isAdmin?: boolean }) {
  const pathname = usePathname();
  return <nav className={ui("appNavigation")} aria-label="Разделы приложения">
    {groups.filter(group => !("admin" in group) || isAdmin).map(group => <div key={group.title} className={ui("navGroup")}>
      <div className={ui("navGroupLabel")}>{group.title}</div>
      {group.pages.map(({ href, label, icon: Icon }) => <Link key={href}
        className={ui("navLink", isActive(pathname, href) && "navLinkActive")}
        href={href} aria-current={isActive(pathname, href) ? "page" : undefined} onClick={onNavigate}>
        <Icon size={19} aria-hidden="true" /><span>{label}</span>
      </Link>)}
    </div>)}
  </nav>;
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const group = groups.find(item => item.pages.some(page => isActive(pathname, page.href)));
  const page = group?.pages.find(item => isActive(pathname, item.href));
  return <div className={ui("appBreadcrumb")}><span>{group?.title}</span><span aria-hidden="true">/</span><strong>{page?.label ?? "Рабочий кабинет"}</strong></div>;
}

export function MobileNavigation({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className={ui("mobileNavigation")}>
    <Button type="button" variant="ghost" aria-label="Открыть меню" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><MenuIcon size={22} aria-hidden="true" /></Button>
    <Brand caption="" />
    <Modal isOpen={open} onClose={() => setOpen(false)} showCloseButton title="Разделы приложения">
      <h2>Разделы приложения</h2>
      <AppNavigation isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
    </Modal>
  </div>;
}
