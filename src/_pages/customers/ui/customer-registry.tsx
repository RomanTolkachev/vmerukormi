"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocalRegistry } from "@/shared/ui/local-registry";
import type { UniversalTableColumnMeta } from "@/shared/ui/universal-table";
import { useEntityCreation } from "@/features/create-entity";
import { ui } from "@/shared/ui/styles";
import { Button, ButtonLink } from "@/shared/ui/controls";

export function CustomerRegistry({ kind, customerId, rows, columns }: { kind: "pets" | "rations" | "calculations"; customerId: string; rows: (Record<string, unknown> & { id: string })[]; columns: UniversalTableColumnMeta[] }) {
  const { open } = useEntityCreation();
  const router = useRouter();
  return <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
    <LocalRegistry tableName={`customer-${kind}-${customerId}`} rows={rows} columns={columns}
      createButton={kind === "pets" ? <Button className={ui("primary")} onClick={() => open({ entity: "pets", initial: { customerId }, onCreated: () => router.refresh() })}>Создать питомца</Button> : kind === "rations" ? <Button className={ui("primary")} onClick={() => open({ entity: "rations", initial: { customerId }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Создать рацион</Button> : undefined}
      actionCellWidth={kind === "pets" ? 350 : undefined}
      actionCell={kind === "pets" ? (_, pet) => <div className={ui("tableActions")}><ButtonLink href={`/pets/${pet.id}`}>Карточка</ButtonLink><Link href={`/?petId=${pet.id}`}>Рассчитать</Link><Button className={ui("secondary")} onClick={() => open({ entity: "rations", initial: { customerId, petId: pet.id }, onCreated: choice => router.push(`/rations/${choice.value}`) })}>Новый рацион</Button></div> : kind === "rations" ? (_, row) => <Link href={`/rations/${row.id}`}>Открыть</Link> : undefined} />
  </div></section>;
}
