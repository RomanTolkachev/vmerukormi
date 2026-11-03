"use client";

import { useRouter } from "next/navigation";
import { useEntityCreation } from "@/features/create-entity";
import { LocalRegistry } from "@/shared/ui/local-registry";
import { ui } from "@/shared/ui/styles";
import type { RationListEntry, RationPetOption, RationCalculationOption, RationCustomerOption } from "@/entities/ration";
import { Button, ButtonLink } from "@/shared/ui/controls";

export function RationsPage({ rations, pets, selectedPetId }: {
  rations: RationListEntry[]; customers: RationCustomerOption[]; pets: RationPetOption[]; calculations: RationCalculationOption[]; selectedPetId?: string;
}) {
  const router = useRouter();
  const { open } = useEntityCreation();
  const initialPet = pets.find(pet => pet.id === selectedPetId);
  const rows = rations.map(ration => ({ ...ration, petName: ration.pet?.name ?? "Без питомца", customerName: ration.pet?.customerName ?? "—", modeLabel: ration.mode === "DAILY" ? "День" : "Неделя" }));
  return <div className={ui("pageLayout", "rationsPage")}>
    <section className={ui("hero")}><div><h1>Рационы</h1><p>Подбор питания и контроль нутриентов</p></div></section>
    <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      <LocalRegistry tableName="rations-list" rows={rows}
        columns={[{ name: "name", label: "Рацион" }, { name: "petName", label: "Питомец" }, { name: "customerName", label: "Клиент" }, { name: "modeLabel", label: "Режим" }, { name: "totalCalories", label: "ккал/сут" }, { name: "targetEnergy", label: "Цель, ккал" }, { name: "itemCount", label: "Продуктов" }]}
        createButton={<Button className={ui("primary")} onClick={() => open({ entity: "rations", initial: { petId: initialPet?.id ?? "", customerId: initialPet?.customerId ?? "" }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Создать рацион</Button>}
        actionCell={(_, row) => <ButtonLink href={`/rations/${row.id}`}>Открыть</ButtonLink>}
      />
    </div></section>
  </div>;
}
