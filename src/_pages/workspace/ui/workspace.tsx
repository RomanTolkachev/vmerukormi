"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWorkspaceRow, getWorkspaceRows } from "@/features/workspace";
import { deleteCustomer } from "@/features/delete-customer";
import { deleteProduct } from "@/features/delete-product";
import { useEntityCreation, type EntityKind } from "@/features/create-entity";
import { ui } from "@/shared/ui/styles";
import { UniversalTable, useTableQuery, type TableBaseQuery } from "@/shared/ui/universal-table";
export type WorkspaceTab = "customers" | "products" | "nutrients" | "rations" | "notifications" | "invoices" | "standards";
const labels: Record<WorkspaceTab, string> = {
  customers: "Клиенты и их питомцы", products: "Каталог продуктов и добавок", nutrients: "Справочник нутриентов", rations: "Рационы",
  notifications: "Уведомления", invoices: "Счета и покупки", standards: "Эталонные значения пород",
};
export function Workspace({ tab, tags = [], isAdmin = false }: { tab: WorkspaceTab; tags?: { id: string; name: string }[]; isAdmin?: boolean }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { open } = useEntityCreation();
  const canCreate = tab !== "invoices" && tab !== "standards";
  const cardPath = ["customers", "products", "standards", "rations"].includes(tab) ? tab : null;
  async function remove(id: string, invalidate: () => void) {
    if (!window.confirm("Удалить запись?")) return;
    try {
      if (tab === "customers") await deleteCustomer(id);
      else if (tab === "products") await deleteProduct(id);
      else await deleteWorkspaceRow(tab, id);
      invalidate();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось удалить запись"); }
  }
  return <div className={ui("pageLayout", "workspacePage")}>
    <section className={ui("hero")}><div><h1>{labels[tab]}</h1><p>Поиск, фильтры и персональные настройки отображения</p></div></section>
    <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      {message && <p role="alert" className={ui("error")}>{message}</p>}
      <UniversalTable<Record<string, unknown>, TableBaseQuery & { tagId: string }>
        tableName={`workspace-${tab}`}
        defaults={{ per_page: 25, tagId: "" }}
        queryFn={query => getWorkspaceRows(tab, query)}
        sortable={["name", "nameRu", "createdAt", "updatedAt", "calories", "protein", "fat"]}
        toolbar={{
          leftSlot: tab === "products" ? () => <TagFilter tags={tags} /> : undefined,
          search: { enabled: true, placeholder: tab === "products" ? "Название, группа или тег" : "Поиск" },
          settingsButton: { enabled: true },
          extraButtons: canCreate ? [{ key: "create", render: context => <button className={ui("primary")} onClick={() => open({ entity: tab as EntityKind, onCreated: choice => { context.invalidateRows(); if (tab === "products") router.push(`/products/${choice.value}`); } })}>Создать</button> }] : [],
        }}
        getRowId={row => String(row.id)}
        rowSelection={{ enabled: true }}
        cardsView={{ render: (context, row) => <article className={ui("card")}><div className={ui("cardBody")}><h3>{String(row.name ?? row.nameRu ?? row.title ?? row.number)}</h3>{cardPath && <Link href={`/${cardPath}/${row.id}`}>Открыть →</Link>}<p>{String(row.category ?? row.groupName ?? row.body ?? "")}</p></div></article> }}
        actionCell={(context, row) => <div className={ui("tableActions")}>
          {cardPath && <Link className={ui("secondary", "linkButton")} href={`/${cardPath}/${row.id}`}>Открыть</Link>}
          {tab !== "invoices" && tab !== "standards" && <button className={ui("danger")} disabled={row.canEdit === false || (tab === "nutrients" && row.isShared === true && !isAdmin)} onClick={() => void remove(String(row.id), context.invalidateRows)}>Удалить</button>}
        </div>}
        actionCellWidth={220}
        formatCellValue={(column, value) => column.endsWith("At") && value ? new Date(String(value)).toLocaleString("ru-RU") : String(value ?? "—")}
      />
    </div></section>
  </div>;
}

function TagFilter({ tags }: { tags: { id: string; name: string }[] }) {
  const query = useTableQuery<TableBaseQuery & { tagId: string }>();
  return <select aria-label="Фильтр по тегу" className={ui("input")} value={query.committed.tagId} onChange={event => query.submit({ patch: { tagId: event.target.value }, resetPage: true })}>
    <option value="">Все теги</option>{tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
  </select>;
}
