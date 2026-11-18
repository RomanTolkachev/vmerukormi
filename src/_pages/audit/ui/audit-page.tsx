"use client";

import { useState } from "react";
import { requestJson } from "@/shared/api";
import { UniversalTable } from "@/shared/ui/universal-table";
import { Button, Select } from "@/shared/ui/controls";
import { Modal } from "@/shared/ui/modal";
import { JsonDetails } from "@/shared/ui/json-details";
import { ui } from "@/shared/ui/styles";

type EventRow = { id: string; createdAt: string; actorEmail: string | null; action: string; entityType: string; entityId: string | null; before: unknown; after: unknown };
const actions: Record<string, string> = { CREATE: "Создание", UPDATE: "Изменение", DELETE: "Удаление", RESTORE: "Восстановление", REGISTER: "Регистрация", LOGIN: "Вход", LOGIN_FAILED: "Неудачный вход", LOGOUT: "Выход", EXPORT: "Экспорт" };
type Response = { rows: EventRow[]; total: number; page: number; per_page: number; columns: { name: string; label: string }[] };

export function AuditPage() {
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<EventRow | null>(null);
  return <div className={ui("pageLayout", "workspacePage")}>
    <section className={ui("hero")}><div><h1>Журнал действий</h1><p>История изменений и входов. Пароли и токены не сохраняются.</p></div></section>
    <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      <label className={ui("field")}><span>Действие</span><Select value={action} onChange={event => setAction(event.target.value)}><option value="">Все действия</option>{Object.entries(actions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
      <UniversalTable<EventRow> key={action} tableName={"audit-" + action} getRowId={row => row.id}
        queryFn={query => requestJson<Response>("/api/audit?" + new URLSearchParams({ action, search: query.search ?? "", page: String(query.page), per_page: String(query.per_page) }))}
        toolbar={{ search: { enabled: true, placeholder: "Email, тип или идентификатор записи" }, settingsButton: { enabled: true } }}
        columnSizeData={{ createdAt: 190, actorEmail: 260, action: 180, entityType: 180, entityId: 240 }}
        formatCellValue={(column, value) => column === "createdAt" ? new Date(String(value)).toLocaleString("ru-RU") : column === "action" ? actions[String(value)] ?? String(value) : String(value ?? "—")}
        actionCell={(context, row) => <Button onClick={() => setSelected(row)}>Подробности</Button>} actionCellWidth={140} />
    </div></section>
    {selected && <Modal isOpen showCloseButton title="Подробности действия" onClose={() => setSelected(null)}>
      <h2 className={ui("formDialogHeading")}>{actions[selected.action] ?? selected.action}</h2>
      <div className={ui("loginForm")}>
        <p className={ui("meta")}>{selected.actorEmail ?? "Без авторизации"} · {new Date(selected.createdAt).toLocaleString("ru-RU")}</p>
        <section className={ui("field")} aria-label="До изменения"><span>До</span><JsonDetails value={selected.before} /></section>
        <section className={ui("field")} aria-label="После изменения"><span>После</span><JsonDetails value={selected.after} /></section>
      </div>
    </Modal>}
  </div>;
}
