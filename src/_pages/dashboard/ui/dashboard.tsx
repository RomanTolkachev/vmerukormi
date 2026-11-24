"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCalculations, type CalculationHistoryItem } from "@/entities/calculation";
import { getPets, type Pet } from "@/entities/pet";
import { CalculationEntry } from "@/features/calculate-energy";
import { useEntityCreation } from "@/features/create-entity";
import { deletePet } from "@/features/delete-pet";
import { requestJson } from "@/shared/api";
import { LocalRegistry } from "@/shared/ui/local-registry";
import { notify } from "@/shared/ui/notifications";
import { ui } from "@/shared/ui/styles";
import { Button, ButtonLink } from "@/shared/ui/controls";
import { InfoPage } from "./info-page";

export type DashboardTab = "calc" | "pets" | "history" | "info";
export function Dashboard({ initialTab = "calc", selectedPetId, selectedCustomerId }: { initialTab?: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  const { open } = useEntityCreation();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const pets = useQuery<Pet[]>({ queryKey: ["pets"], enabled: initialTab === "pets", queryFn: ({ signal }) => getPets(signal) });
  const history = useQuery<CalculationHistoryItem[]>({ queryKey: ["calculations"], enabled: initialTab === "history", queryFn: ({ signal }) => getCalculations(signal) });
  async function remove(id: string, entity: "pets" | "calculations") {
    if (deleting || !window.confirm(entity === "pets" ? "Удалить питомца?" : "Удалить расчёт? Связанные рационы останутся без изменений.")) return;
    setDeleting(id); setError("");
    try {
      if (entity === "pets") await deletePet(id);
      else await requestJson(`/api/calculations/${id}`, { method: "DELETE" });
      await client.invalidateQueries({ queryKey: [entity] });
      void client.invalidateQueries({ queryKey: ["entity-options", entity] });
      notify.success(entity === "pets" ? "Питомец удалён" : "Расчёт удалён");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось удалить запись"); }
    finally { setDeleting(null); }
  }
  return <div className={ui("pageLayout", "dashboardPage")}>
    <section className={ui("hero")}><div><h1>Питание без чёрного ящика</h1><p>Рассчитывайте суточную обменную энергию кошек и собак по формулам. Все коэффициенты доступны в справочнике.</p></div><span className={ui("badge")}>Защищённая сессия</span></section>
    {initialTab === "calc" && <CalculationEntry initialPetId={selectedPetId} customerId={selectedCustomerId} />}
    {initialTab === "pets" && <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      {pets.isPending ? <p role="status">Загружаем питомцев…</p> : pets.isError ? <p role="alert">Не удалось загрузить питомцев. <Button onClick={() => void pets.refetch()}>Повторить</Button></p> :
      <LocalRegistry tableName="pets-list" refreshing={pets.isFetching} rows={(pets.data ?? []).map(pet => ({ ...pet, speciesLabel: pet.species === "CAT" ? "Кошка" : pet.species === "DOG" ? "Собака" : pet.species, customerName: pet.customer?.name ?? "Без клиента" }))}
        columns={[{ name: "name", label: "Питомец" }, { name: "speciesLabel", label: "Вид" }, { name: "customerName", label: "Клиент" }, { name: "actualWeight", label: "Вес, кг" }, { name: "idealWeight", label: "Идеальный вес" }, { name: "bcs", label: "BCS" }]}
        createButton={<Button variant="primary" onClick={() => open({ entity: "pets", initial: { customerId: selectedCustomerId ?? "" }, onCreated: () => { void client.invalidateQueries({ queryKey: ["pets"] }); } })}>Создать питомца</Button>}
        actionCellWidth={320}
        actionCell={(_, pet) => <div className={ui("tableActions")}><ButtonLink href={`/pets/${pet.id}`}>Карточка</ButtonLink><ButtonLink href={`/?petId=${encodeURIComponent(pet.id)}`}>Рассчитать</ButtonLink><Button variant="danger" loading={deleting === pet.id} disabled={Boolean(deleting)} onClick={() => void remove(pet.id, "pets")}>{deleting === pet.id ? "Удаляем…" : "Удалить"}</Button></div>} />}
    </div></section>}
    {initialTab === "history" && <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      {history.isPending ? <p role="status">Загружаем расчёты…</p> : history.isError ? <p role="alert">Не удалось загрузить расчёты. <Button onClick={() => void history.refetch()}>Повторить</Button></p> :
      <LocalRegistry tableName="calculations-history" refreshing={history.isFetching} rows={(history.data ?? []).map(item => ({ ...item, petName: item.pet?.name ?? "Без карточки", moduleName: item.module.name }))}
        columns={[{ name: "name", label: "Название" }, { name: "petName", label: "Питомец" }, { name: "moduleName", label: "Формула" }, { name: "adjustedEnergy", label: "ккал/сут" }, { name: "createdAt", label: "Дата" }]}
        formatCellValue={(column, value) => column === "createdAt" ? new Date(String(value)).toLocaleString("ru-RU") : String(value ?? "—")}
        createButton={<Button variant="primary" onClick={() => open({ entity: "calculations" })}>Создать расчёт</Button>}
        actionCellWidth={140} actionCell={(_, row) => <Button variant="danger" loading={deleting === row.id} disabled={Boolean(deleting)} onClick={() => void remove(row.id, "calculations")}>{deleting === row.id ? "Удаляем…" : "Удалить"}</Button>} />}
    </div></section>}
    {error && <p role="alert" className={ui("error")}>{error}</p>}
    {initialTab === "info" && <InfoPage />}
  </div>;
}
