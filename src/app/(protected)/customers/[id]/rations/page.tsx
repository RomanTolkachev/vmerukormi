import { getCustomerRations } from "@backend/application/customers/queries";
import { CustomerRegistry } from "@/_pages/customers";
export default async function CustomerRationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rations = await getCustomerRations(id);
  return <CustomerRegistry kind="rations" customerId={id} rows={rations.map(ration => ({ id: ration.id, name: ration.name, pet: ration.pet?.name ?? "—", updatedAt: ration.updatedAt.toLocaleString("ru-RU"), mode: ration.mode === "DAILY" ? "День" : "Неделя", targetEnergy: ration.targetEnergy, count: ration._count.items }))}
    columns={[{ name: "name", label: "Название" }, { name: "pet", label: "Питомец" }, { name: "mode", label: "Режим" }, { name: "targetEnergy", label: "Цель, ккал" }, { name: "count", label: "Позиций" }, { name: "updatedAt", label: "Изменён" }]} />;
}
