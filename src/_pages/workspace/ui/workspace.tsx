"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createWorkspaceRow,
  deleteWorkspaceRow,
  getWorkspaceRows,
} from "@/features/workspace";
import { createCustomer } from "@/features/create-customer";
import { deleteCustomer } from "@/features/delete-customer";
import { createProduct } from "@/features/create-product";
import { deleteProduct } from "@/features/delete-product";
import { ui } from "@/shared/ui/styles";
import {
  UniversalTable,
  type TableBaseQuery,
} from "@/shared/ui/universal-table";
export type WorkspaceTab =
  | "customers"
  | "products"
  | "nutrients"
  | "rations"
  | "notifications"
  | "invoices"
  | "standards";
const labels: Record<WorkspaceTab, string> = {
  customers: "Клиенты и их питомцы",
  products: "Каталог продуктов и добавок",
  nutrients: "Справочник нутриентов",
  rations: "Рационы",
  notifications: "Уведомления",
  invoices: "Счета и покупки",
  standards: "Эталонные значения пород",
};
export function Workspace({ tab, tags = [], isAdmin = false }: { tab: WorkspaceTab; tags?: { id: string; name: string }[]; isAdmin?: boolean }) {
  const [tagId, setTagId] = useState("");
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const canCreate = tab !== "invoices" && tab !== "standards";
  const isCustomers = tab === "customers";
  const isStandards = tab === "standards";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const entries = Object.fromEntries(new FormData(form));
      const data = { ...entries, isShared: entries.isShared === "on" };
      if (tab === "customers") await createCustomer(entries);
      else if (tab === "products") {
        const product = await createProduct(data);
        router.push(`/products/${product.id}`);
        return;
      } else await createWorkspaceRow(tab, data);
      form.reset();
      setVersion((v) => v + 1);
      setMessage("Сохранено");
    } catch (x) {
      setMessage(x instanceof Error ? x.message : "Ошибка");
    }
  }
  async function remove(id: unknown) {
    if (tab === "customers") await deleteCustomer(String(id));
    else if (tab === "products") await deleteProduct(String(id));
    else await deleteWorkspaceRow(tab, id);
    setVersion((v) => v + 1);
  }
  return (
    <div className={ui("pageLayout", "workspacePage")}>
        <section className={ui("hero")}>
          <div>
            <h1>{labels[tab]}</h1>
            <p>
              Данные сохраняются в PostgreSQL; списки поддерживают поиск,
              сортировку и настройку колонок.
            </p>
          </div>
          <Link className={ui("badge")} href="/">
            Калькулятор энергии →
          </Link>
        </section>
        <div className={ui("workspaceGrid", !canCreate && "workspaceGridSingle")}>
          <section className={ui("card")}>
            <div className={ui("cardHead")}>
              <h2>{labels[tab]}</h2>
              <span className={ui("meta")}>UniversalTable</span>
            </div>
            <div className={ui("cardBody", "tableBody")}>
              <UniversalTable
                key={`${tab}-${version}-${tagId}`}
                tableName={`workspace-${tab}`}
                defaults={{ per_page: 10, tagId } as Partial<TableBaseQuery & { tagId: string }>}
                queryFn={(q) => getWorkspaceRows(tab, q)}
                sortable={["name", "nameRu", "createdAt", "updatedAt"]}
                syncUrlQuery={{ enabled: false }}
                toolbar={{
                  leftSlot: tab === "products" ? () => <select aria-label="Фильтр по тегу" className={ui("input")} value={tagId} onChange={(event) => setTagId(event.target.value)}><option value="">Все теги</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select> : undefined,
                  search: {
                    enabled: true,
                    placeholder: isCustomers
                      ? "Поиск по имени, email или телефону"
                      : tab === "products" ? "Название, группа или тег" : "Поиск по таблице",
                  },
                  settingsButton: { enabled: true },
                }}
                onRowClick={
                  isStandards
                    ? (row) => router.push(`/standards/${String(row.id)}`)
                    : isCustomers
                    ? (row) => router.push(`/customers/${String(row.id)}`)
                    : tab === "products"
                      ? (row) => router.push(`/products/${String(row.id)}`)
                    : undefined
                }
                actionCell={
                  isStandards
                    ? (_, row) => <Link className={ui("secondary", "linkButton")} href={`/standards/${String(row.id)}`}>Эталонные значения →</Link>
                    : tab !== "invoices"
                    ? (_, row) => (
                      <div className={ui("tableActions")}>
                        {isCustomers && (
                          <Link
                            className={ui("secondary", "linkButton")}
                            href={`/customers/${String(row.id)}`}
                          >
                            Карточка →
                          </Link>
                        )}
                        {tab === "products" && (
                          <Link className={ui("secondary", "linkButton")} href={`/products/${String(row.id)}`}>
                            Карточка →
                          </Link>
                        )}
                        <button
                          className={ui("danger")}
                          disabled={row.canEdit === false || (tab === "nutrients" && row.isShared === true && !isAdmin)}
                          onClick={() => void remove(row.id).catch((error) => setMessage(error.message))}
                        >
                          Удалить
                        </button>
                      </div>
                      )
                    : undefined
                }
                formatCellValue={(v, c, row) => {
                  if ((isCustomers || tab === "products") && c.name === "name") {
                    return (
                      <Link
                        className={ui("tablePrimaryLink")}
                        href={isCustomers ? `/customers/${String(row.id)}` : `/products/${String(row.id)}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {String(v ?? "Без имени")}
                      </Link>
                    );
                  }
                  return c.name.endsWith("At") && v
                    ? new Date(String(v)).toLocaleString("ru-RU")
                    : String(v ?? "—");
                }}
              />
            </div>
          </section>
          {canCreate && (
            <CreatePanel tab={tab} onSubmit={submit} message={message} isAdmin={isAdmin} />
          )}
        </div>
    </div>
  );
}
function CreatePanel({
  isAdmin,
  tab,
  onSubmit,
  message,
}: {
  isAdmin: boolean;
  tab: WorkspaceTab;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  message: string;
}) {
  return (
    <section className={ui("card")}>
      <form onSubmit={onSubmit}>
        <div className={ui("cardHead")}>
          <h2>Новая запись</h2>
        </div>
        <div className={ui("cardBody")}>
          <div className={ui("formGrid", "single")}>
            {tab === "customers" && (
              <>
                <Field name="name" label="Имя клиента" required />
                <Field name="email" label="Email" type="email" />
                <Field name="phone" label="Телефон" />
                <Field name="note" label="Заметка" />
              </>
            )}
            {tab === "products" && (
              <>
                <Field name="name" label="Название" required />
                <Select
                  name="kind"
                  label="Тип"
                  options={[
                    ["PRODUCT", "Продукт"],
                    ["SUPPLEMENT", "Добавка"],
                    ["RECIPE", "Рецепт"],
                  ]}
                />
                <Field name="calories" label="ккал / 100 г" type="number" />
                <Field name="protein" label="Белок, г" type="number" />
                <Field name="fat" label="Жир, г" type="number" />
                <Field name="carbs" label="Углеводы, г" type="number" />
              </>
            )}
            {tab === "nutrients" && (
              <>
                <Field name="code" label="Код" required />
                <Field name="name" label="Название" required />
                <Field name="category" label="Категория" required />
                <Field name="unit" label="Единица" required />
              </>
            )}
            {tab === "rations" && (
              <>
                <Field name="name" label="Название рациона" required />
                <Select
                  name="mode"
                  label="Режим"
                  options={[
                    ["DAILY", "На день"],
                    ["WEEKLY", "На неделю"],
                  ]}
                />
                <Field
                  name="targetEnergy"
                  label="Целевая энергия"
                  type="number"
                />
                <Field name="note" label="Комментарий" />
              </>
            )}
            {tab === "notifications" && (
              <>
                <Field name="title" label="Заголовок" required />
                <Field name="body" label="Текст" required />
              </>
            )}
          </div>
          {isAdmin && (tab === "products" || tab === "nutrients") && <label><input type="checkbox" name="isShared" /> Общий каталог для всех пользователей</label>}
          <div className={ui("actions")}>
            <button className={ui("primary")}>Сохранить</button>
          </div>
          {message && <div className={ui("meta", "formMessage")}>{message}</div>}
        </div>
      </form>
    </section>
  );
}
function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className={ui("field")}>
      <span>{label}</span>
      <input
        className={ui("input")}
        name={name}
        type={type}
        required={required}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}
function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[][];
}) {
  return (
    <label className={ui("field")}>
      <span>{label}</span>
      <select className={ui("input")} name={name}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
