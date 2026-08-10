import { ui } from "@/shared/ui/styles/ui";
import Link from "next/link";
import { getCustomerRations } from "@backend/application/customers/queries";

export default async function CustomerRationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rations = await getCustomerRations(id);

  return <section className={ui("card")}>
    <div className={ui("cardHead")}><div><h2>Рационы клиента</h2><div className={ui("meta")}>Рационы всех связанных питомцев</div></div><Link className={ui("secondary", "linkButton")} href="/rations">Все рационы</Link></div>
    <div className={ui("cardBody")}>
      {rations.length ? <div className={ui("detailTableWrap")}><table className={ui("detailTable")}><thead><tr><th>Изменён</th><th>Название</th><th>Питомец</th><th>Режим</th><th>Цель</th><th>Позиций</th></tr></thead><tbody>{rations.map((ration) => <tr key={ration.id}>
        <td>{ration.updatedAt.toLocaleString("ru-RU")}</td>
        <td><Link className={ui("tablePrimaryLink")} href={`/rations/${ration.id}`}>{ration.name}</Link></td>
        <td>{ration.pet?.name ?? "Без питомца"}</td>
        <td>{ration.mode === "DAILY" ? "На день" : "На неделю"}</td>
        <td>{ration.targetEnergy || "—"}{ration.targetEnergy ? " ккал" : ""}</td>
        <td>{ration._count.items}</td>
      </tr>)}</tbody></table></div> : <div className={ui("empty")}>По питомцам клиента ещё нет рационов</div>}
    </div>
  </section>;
}
