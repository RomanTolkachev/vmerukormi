import { ui } from "@/shared/ui/styles";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerHeader } from "@backend/application/customers/queries";
import { CustomerTabs } from "@/entities/customer";

export default async function CustomerLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerHeader(id);
  if (!customer) notFound();

  return <div className={ui("pageLayout", "customerPage")}>
    <section className={ui("customerHeader")}>
      <div>
        <Link className={ui("backLink")} href="/customers">← Все клиенты</Link>
        <h1>{customer.name}</h1>
        <div className={ui("customerContacts")}>
          <span>{customer.email || "E-mail не указан"}</span>
          <span>{customer.phone || "Телефон не указан"}</span>
        </div>
      </div>
      <div className={ui("customerSummary")}>
        <strong>{customer._count.pets}</strong>
        <span>{customer._count.pets === 1 ? "питомец" : "питомцев"}</span>
      </div>
    </section>
    {customer.note && <div className={ui("customerNote")}><b>Заметка:</b> {customer.note}</div>}
    <CustomerTabs customerId={id} />
    <div className={ui("customerPageContent")}>{children}</div>
  </div>;
}
