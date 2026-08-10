import { ui } from "@/shared/ui/styles/ui";
import Link from "next/link";
import { getCustomerCalculations } from "@backend/application/customers/queries";

export default async function CustomerCalculationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculations = await getCustomerCalculations(id);

  return <section className={ui("card")}>
    <div className={ui("cardHead")}><div><h2>Расчёты клиента</h2><div className={ui("meta")}>Все расчёты по его питомцам</div></div><span className={ui("meta")}>{calculations.length} записей</span></div>
    <div className={ui("cardBody")}>
      {calculations.length ? <div className={ui("detailTableWrap")}><table className={ui("detailTable")}><thead><tr><th>Дата</th><th>Питомец</th><th>Модуль</th><th>Вес</th><th>BCS</th><th>Энергия</th></tr></thead><tbody>{calculations.map((item) => <tr key={item.id}>
        <td>{item.createdAt.toLocaleString("ru-RU")}</td>
        <td>{item.pet?.name ?? "Удалённый питомец"}</td>
        <td>{item.module.name}</td>
        <td>{item.actualWeight} / {item.idealWeight} кг</td>
        <td>{item.bcs}/9</td>
        <td><b>{item.adjustedEnergy}</b> ккал/сут</td>
      </tr>)}</tbody></table></div> : <div className={ui("empty")}>По питомцам клиента ещё нет расчётов. <Link href={`/pets?customerId=${encodeURIComponent(id)}`}>Перейти к питомцам</Link></div>}
    </div>
  </section>;
}

