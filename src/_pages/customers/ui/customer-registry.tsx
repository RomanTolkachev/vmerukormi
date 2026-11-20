"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "@/shared/api";
import { notify } from "@/shared/ui/notifications";
import { LocalRegistry } from "@/shared/ui/local-registry";
import type { UniversalTableColumnMeta } from "@/shared/ui/universal-table";
import { useEntityCreation } from "@/features/create-entity";
import { ui } from "@/shared/ui/styles";
import { Button, ButtonLink } from "@/shared/ui/controls";

export function CustomerRegistry({ kind, customerId, rows, columns }: { kind: "pets" | "rations" | "calculations"; customerId: string; rows: (Record<string, unknown> & { id: string })[]; columns: UniversalTableColumnMeta[] }) {
  const { open } = useEntityCreation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function removeCalculation(id: string) {
    if (busy || !window.confirm("Удалить расчёт? Связанные рационы останутся без изменений.")) return;
    setBusy(true);
    try { await requestJson(`/api/calculations/${id}`, { method: "DELETE" }); notify.success("Расчёт удалён"); router.refresh(); }
    catch (error) { notify.error(error instanceof Error ? error.message : "Не удалось удалить расчёт"); }
    finally { setBusy(false); }
  }
  return <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
    <LocalRegistry tableName={`customer-${kind}-${customerId}`} rows={rows} columns={columns}
      createButton={kind === "pets" ? <Button className={ui("primary")} onClick={() => open({ entity: "pets", initial: { customerId }, onCreated: () => router.refresh() })}>Создать питомца</Button> : kind === "rations" ? <Button className={ui("primary")} onClick={() => open({ entity: "rations", initial: { customerId }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Создать рацион</Button> : <Button variant="primary" onClick={() => open({ entity: "calculations", initial: { customerId }, onCreated: () => router.refresh() })}>Создать расчёт</Button>}
      actionCellWidth={kind === "pets" ? 350 : 150}
      actionCell={kind === "pets" ? (_, pet) => <div className={ui("tableActions")}><ButtonLink href={`/pets/${pet.id}`}>Карточка</ButtonLink><ButtonLink href={`/?petId=${pet.id}`}>Рассчитать</ButtonLink><Button className={ui("secondary")} onClick={() => open({ entity: "rations", initial: { customerId, petId: pet.id }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Новый рацион</Button></div> : kind === "rations" ? (_, row) => <Link href={`/rations/${row.id}`}>Открыть</Link> : (_, row) => <Button variant="danger" disabled={busy} onClick={() => void removeCalculation(row.id)}>Удалить</Button>} />
  </div></section>;
}
