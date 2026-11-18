"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, requestJson } from "@/shared/api";
import { UniversalTable, type TableBaseQuery } from "@/shared/ui/universal-table";
import { Button, Input, Select } from "@/shared/ui/controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { RequiredMark } from "@/shared/ui/required-mark";
import { notify } from "@/shared/ui/notifications";
import { ui } from "@/shared/ui/styles";

type UserRow = { id: string; name: string; email: string; role: "ADMIN" | "USER"; createdAt: string; deletedAt: string | null };
type UsersResponse = { rows: UserRow[]; total: number; page: number; per_page: number; columns: { name: string; label: string }[] };

export function UsersPage() {
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const client = useQueryClient();
  const tableName = deleted ? "users-deleted" : "users-active";
  async function removeOrRestore(user: UserRow, invalidate: () => void) {
    if (!user.deletedAt && !window.confirm("Удалить пользователя? Его сессии завершатся, данные останутся доступны для восстановления.")) return;
    setPendingId(user.id);
    try {
      const response = await apiFetch("/api/users/" + user.id, { method: user.deletedAt ? "PATCH" : "DELETE", headers: { "Content-Type": "application/json" }, ...(user.deletedAt ? { body: JSON.stringify({ restore: true }) } : {}) });
      if (!response.ok) throw new Error((await response.json()).error);
      notify.success(user.deletedAt ? "Пользователь восстановлен" : "Пользователь удалён");
      invalidate();
    } catch (error) { notify.error(error instanceof Error ? error.message : "Не удалось выполнить действие"); }
    finally { setPendingId(null); }
  }
  return <div className={ui("pageLayout", "workspacePage")}>
    <section className={ui("hero")}><div><h1>Пользователи</h1><p>Учётные записи, роли и доступ к приложению</p></div><Button variant="primary" onClick={() => setEditing("new")}>Создать пользователя</Button></section>
    <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
      <label className={ui("actions")}><Input type="checkbox" checked={deleted} onChange={event => setDeleted(event.target.checked)} />Показать удалённых</label>
      <UniversalTable<UserRow> key={tableName} tableName={tableName} getRowId={row => row.id}
        queryFn={(query: TableBaseQuery) => requestJson<UsersResponse>("/api/users?" + new URLSearchParams({ page: String(query.page), per_page: String(query.per_page), search: query.search ?? "", deleted: String(deleted) }))}
        toolbar={{ search: { enabled: true, placeholder: "Имя или email" }, settingsButton: { enabled: true } }}
        columnSizeData={{ name: 240, email: 280, role: 150, createdAt: 190 }}
        formatCellValue={(column, value) => column === "createdAt" ? new Date(String(value)).toLocaleString("ru-RU") : column === "role" ? value === "ADMIN" ? "Администратор" : "Пользователь" : String(value ?? "—")}
        actionCellWidth={240}
        actionCell={(context, row) => <div className={ui("tableActions")}>
          {!deleted && <Button onClick={() => setEditing(row)}>Редактировать</Button>}
          <Button variant={deleted ? "secondary" : "danger"} disabled={pendingId === row.id} onClick={() => void removeOrRestore(row, context.invalidateRows)}>{deleted ? "Восстановить" : "Удалить"}</Button>
        </div>} />
    </div></section>
    {editing && <UserDialog user={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void client.invalidateQueries({ queryKey: [tableName] }); }} />}
  </div>;
}

function UserDialog({ user, onClose, onSaved }: { user: UserRow | null; onClose: () => void; onSaved: () => void }) {
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await requestJson(user ? "/api/users/" + user.id : "/api/users", {
        method: user ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), role: form.get("role"), ...(form.get("password") ? { password: form.get("password") } : {}) }),
      });
      notify.success(user ? "Пользователь обновлён" : "Пользователь создан. Передайте ему пароль лично.");
      onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сохранить пользователя"); }
    finally { setPending(false); }
  }
  return <FormDialog title={user ? "Редактировать пользователя" : "Создать пользователя"} onClose={onClose} dirty={dirty} busy={pending} discardTitle="Отменить изменения?" discardLabel="Отменить изменения">
    <form onSubmit={submit} onChange={() => setDirty(true)} className={ui("loginForm")}>
      <label className={ui("field")}><span>Имя<RequiredMark /></span><Input name="name" defaultValue={user?.name ?? ""} required maxLength={80} /></label>
      <label className={ui("field")}><span>Email<RequiredMark /></span><Input name="email" type="email" defaultValue={user?.email ?? ""} required maxLength={254} autoComplete="off" /></label>
      <label className={ui("field")}><span>Роль<RequiredMark /></span><Select name="role" defaultValue={user?.role ?? "USER"} required><option value="USER">Пользователь</option><option value="ADMIN">Администратор</option></Select></label>
      <label className={ui("field")}><span>{user ? "Новый пароль" : "Пароль"}{!user && <RequiredMark />}</span><Input name="password" type="password" autoComplete="new-password" required={!user} minLength={6} maxLength={200} /><small>{user ? "Оставьте пустым, чтобы сохранить текущий пароль." : "Не менее 6 символов. Письмо отправлено не будет."}</small></label>
      {error && <p className={ui("error")} role="alert">{error}</p>}
      <Button type="submit" variant="primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</Button>
    </form>
  </FormDialog>;
}
