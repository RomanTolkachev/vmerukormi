import { getCustomerCalculations } from "@backend/application/customers/queries";
import { CustomerRegistry } from "@/_pages/customers";
export default async function CustomerCalculationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculations = await getCustomerCalculations(id);
  return <CustomerRegistry kind="calculations" customerId={id} rows={calculations.map(item => ({ id: item.id, name: item.name, pet: item.pet?.name ?? "Удалённый питомец", module: (item.formulaSnapshot as { name?: string }).name ?? item.module.name, createdAt: item.createdAt.toLocaleString("ru-RU"), actualWeight: item.actualWeight, bcs: item.bcs, adjustedEnergy: item.adjustedEnergy }))}
    columns={[{ name: "name", label: "Название" }, { name: "createdAt", label: "Дата" }, { name: "pet", label: "Питомец" }, { name: "module", label: "Формула" }, { name: "actualWeight", label: "Вес, кг" }, { name: "bcs", label: "BCS" }, { name: "adjustedEnergy", label: "ккал/сут" }]} />;
}

