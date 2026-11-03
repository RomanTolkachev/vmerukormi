"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWorkspaceRow, getWorkspaceRows } from "@/features/workspace";
import { deleteCustomer } from "@/features/delete-customer";
import { deleteProduct } from "@/features/delete-product";
import { useEntityCreation, type EntityKind } from "@/features/create-entity";
import { ui } from "@/shared/ui/styles";
import { UniversalTable, useTableQuery, type TableBaseQuery } from "@/shared/ui/universal-table";
import { Button, ButtonLink, Select } from "@/shared/ui/controls";
import { AddIcon } from "@/shared/ui/icons";
export type WorkspaceTab = "customers" | "products" | "nutrients" | "rations" | "notifications" | "invoices" | "standards";
const labels: Record<WorkspaceTab, string> = {
  customers: "Клиенты и их питомцы", products: "Продукты и добавки", nutrients: "Справочник нутриентов", rations: "Рационы",
  notifications: "Уведомления", invoices: "Счета и покупки", standards: "Эталонные значения пород",
};
export function Workspace({ tab, tags = [], isAdmin = false }: { tab: WorkspaceTab; tags?: { id: string; name: string }[]; isAdmin?: boolean }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
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
    <section className={ui("hero")}><div><h1>{labels[tab]}</h1><p>{tab === "products" ? "Общий и личный каталог для составления рационов" : "Поиск, фильтры и персональные настройки отображения"}</p></div>
      {canCreate && <Button type="button" variant="primary" onClick={() => open({ entity: tab as EntityKind, onCreated: choice => { void queryClient.invalidateQueries({ queryKey: [`workspace-${tab}`] }); if (tab === "products") router.push(`/products/${choice.value}`); } })}><AddIcon size={18} aria-hidden="true" />{tab === "products" ? "Создать продукт" : "Создать"}</Button>}
    </section>
    <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      {message && <p role="alert" className={ui("error")}>{message}</p>}
      <UniversalTable<Record<string, unknown>, TableBaseQuery & { tagId: string }>
        tableName={`workspace-${tab}`}
        defaults={{ per_page: 25, tagId: "" }}
        queryFn={query => getWorkspaceRows(tab, query)}
        sortable={["name", "nameRu", "createdAt", "updatedAt", "calories", "protein", "fat"]}
        toolbar={{
          inlineSlot: tab === "products" ? () => <TagFilter tags={tags} /> : undefined,
          search: { enabled: true, placeholder: tab === "products" ? "Название, группа или тег" : "Поиск" },
          settingsButton: { enabled: true },
          filtersButton: tab === "products" ? {
            render: () => <div className={ui("field")}><span>Тег продукта</span><TagFilter tags={tags} draft /></div>,
            applied: query => query.tagId ? [{ key: "tagId", label: `Тег: ${tags.find(tag => tag.id === query.tagId)?.name ?? "не найден"}`, fields: ["tagId"] }] : [],
          } : undefined,
        }}
        getRowId={row => String(row.id)}
        cardsView={{ render: (context, row) => <article className={ui("card")}><div className={ui("cardBody")}><h3>{String(row.name ?? row.nameRu ?? row.title ?? row.number)}</h3>{cardPath && <Link href={`/${cardPath}/${row.id}`}>Открыть →</Link>}<p>{String(row.category ?? row.groupName ?? row.body ?? "")}</p></div></article> }}
        actionCell={(context, row) => <div className={ui("tableActions")}>
          {cardPath && <ButtonLink href={`/${cardPath}/${row.id}`}>Открыть</ButtonLink>}
          {tab !== "invoices" && tab !== "standards" && <Button className={ui("danger")} disabled={row.canEdit === false || (tab === "nutrients" && row.isShared === true && !isAdmin)} onClick={() => void remove(String(row.id), context.invalidateRows)}>Удалить</Button>}
        </div>}
        actionCellWidth={170}
        columnSizeData={{ name: 270, nameRu: 240, phone: 195, kind: 110, groupName: 170, tagNames: 220, catalogLabel: 110, calories: 120, protein: 100, fat: 100 }}
        formatCellValue={(column, value) => {
          if (column.endsWith("At") && value) return new Date(String(value)).toLocaleString("ru-RU");
          if (typeof value === "number") return <span className={ui("numericCell")}>{value.toLocaleString("ru-RU", { maximumFractionDigits: 6 })}</span>;
          if (value === "PRODUCT") return "Продукт";
          if (value === "SUPPLEMENT") return "Добавка";
          if (value === "Общий" || value === "Личный") return <span className={ui("catalogBadge", value === "Личный" && "catalogBadgePersonal")}>{value}</span>;
          return <span className={ui(column === "name" || column === "nameRu" ? "registryName" : column === "tagNames" ? "registryTags" : undefined)}>{String(value ?? "—")}</span>;
        }}
      />
    </div></section>
  </div>;
}

function TagFilter({ tags, draft = false }: { tags: { id: string; name: string }[]; draft?: boolean }) {
  const query = useTableQuery<TableBaseQuery & { tagId: string }>();
  const draftValue = useWatch({ control: query.control, name: "tagId" });
  return <Select aria-label="Фильтр по тегу" className={ui("tagFilter")} value={draft ? draftValue : query.committed.tagId} onChange={event => draft ? query.setField("tagId", event.target.value) : query.submit({ patch: { tagId: event.target.value }, resetPage: true })}>
    <option value="">Все теги</option>{tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
  </Select>;
}
