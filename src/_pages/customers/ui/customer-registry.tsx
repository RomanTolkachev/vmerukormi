"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocalRegistry } from "@/shared/ui/local-registry";
import type { UniversalTableColumnMeta } from "@/shared/ui/universal-table";
import { useEntityCreation } from "@/features/create-entity";
import { ui } from "@/shared/ui/styles";

export function CustomerRegistry({ kind, customerId, rows, columns }: { kind: "pets" | "rations" | "calculations"; customerId: string; rows: (Record<string, unknown> & { id: string })[]; columns: UniversalTableColumnMeta[] }) {
  const { open } = useEntityCreation();
  const router = useRouter();
  return <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
    <LocalRegistry tableName={`customer-${kind}-${customerId}`} rows={rows} columns={columns}
      createButton={kind === "pets" ? <button className={ui("primary")} onClick={() => open({ entity: "pets", initial: { customerId }, onCreated: () => router.refresh() })}>Создать питомца</button> : kind === "rations" ? <button className={ui("primary")} onClick={() => open({ entity: "rations", initial: { customerId }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Создать рацион</button> : undefined}
      actionCell={kind === "pets" ? (_, pet) => <div className={ui("actions")}><Link href={`/?petId=${pet.id}`}>Рассчитать</Link><button className={ui("secondary")} onClick={() => open({ entity: "rations", initial: { customerId, petId: pet.id }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Новый рацион</button></div> : kind === "rations" ? (_, row) => <Link href={`/rations/${row.id}`}>Открыть</Link> : undefined} />
  </div></section>;
}
