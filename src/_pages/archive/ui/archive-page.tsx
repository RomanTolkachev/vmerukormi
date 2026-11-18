"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { UniversalTable } from "@/shared/ui/universal-table";
import { Button, Select } from "@/shared/ui/controls";
import { notify } from "@/shared/ui/notifications";
import { ui } from "@/shared/ui/styles";

type ArchiveRow = { id: string; name: string; deletedAt: string; deletedById: string | null };
type ArchiveResponse = { rows: ArchiveRow[]; total: number; page: number; per_page: number; columns: { name: string; label: string }[]; resources: { value: string; label: string }[] };

export function ArchivePage() {
  const [resource, setResource] = useState("products");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const options = useQuery({ queryKey: ["archive-resources"], queryFn: () => requestJson<ArchiveResponse>("/api/archive?resource=products") });
  async function restore(row: ArchiveRow, invalidate: () => void) {
    setPendingId(row.id);
    try {
      await requestJson("/api/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, key: JSON.parse(row.id) }) });
      notify.success("Запись восстановлена");
      invalidate();
    } catch (error) { notify.error(error instanceof Error ? error.message : "Не удалось восстановить запись"); }
    finally { setPendingId(null); }
  }
  return <div className={ui("pageLayout", "workspacePage")}>
    <section className={ui("hero")}><div><h1>Удалённые записи</h1><p>Восстановление не меняет связанные записи и сохранённый состав рационов.</p></div></section>
    <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      <label className={ui("field")}><span>Раздел</span><Select value={resource} onChange={event => setResource(event.target.value)} disabled={!options.data}>{(options.data?.resources ?? [{ value: "products", label: "Продукты" }]).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
      {options.error && <p role="alert" className={ui("error")}>Не удалось загрузить разделы. Обновите страницу.</p>}
      <UniversalTable<ArchiveRow> key={resource} tableName={"archive-" + resource} getRowId={row => row.id}
        queryFn={query => requestJson<ArchiveResponse>("/api/archive?" + new URLSearchParams({ resource, page: String(query.page), per_page: String(query.per_page) }))}
        toolbar={{ settingsButton: { enabled: true } }}
        columnSizeData={{ name: 320, deletedAt: 200, deletedById: 240 }}
        formatCellValue={(column, value) => column === "deletedAt" ? new Date(String(value)).toLocaleString("ru-RU") : String(value ?? "—")}
        actionCell={(context, row) => <Button disabled={pendingId === row.id} onClick={() => void restore(row, context.invalidateRows)}>Восстановить</Button>} actionCellWidth={160} />
    </div></section>
  </div>;
}
