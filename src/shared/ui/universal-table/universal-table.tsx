"use client";
/* eslint-disable @typescript-eslint/no-unused-expressions */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  TableBaseQuery,
  UniversalTableListResponse,
  UniversalTableProps,
} from "./types";
import styles from "./universal-table.module.css";
import { apiFetch } from "@/shared/api";
import { ui } from "@/shared/ui/styles";

type Settings = {
  visible?: Record<string, boolean>;
  order?: string[];
  query?: Record<string, unknown>;
};

export function UniversalTable<
  TRow extends Record<string, unknown>,
  TQuery extends TableBaseQuery = TableBaseQuery,
  TResponse extends UniversalTableListResponse<TRow> =
  UniversalTableListResponse<TRow>,
>(props: UniversalTableProps<TRow, TQuery, TResponse>) {
  const defaults = useMemo(
    () => ({ page: 1, per_page: 20, search: "", ...props.defaults }) as TQuery,
    [props.defaults],
  );
  const [query, setQuery] = useState(defaults);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const settingsRef = useRef<HTMLDialogElement>(null);
  const qc = useQueryClient();
  const settings = useQuery<Settings>({
    queryKey: ["table-options", props.tableName],
    queryFn: () =>
      fetch(`/api/table-options/${props.tableName}`).then((r) =>
        r.ok ? r.json() : {},
      ),
    staleTime: Infinity,
  });
  const rowsQuery = useQuery({
    queryKey: [props.tableName, query],
    queryFn: () => props.queryFn(query),
  });
  const data = rowsQuery.data;
  const baseColumns = data?.columns ?? [];
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const order = settings.data?.order ?? [];
  useEffect(() => {
    if (!props.syncUrlQuery?.enabled) return;
    const url = new URL(location.href);
    Object.entries(query).forEach(([k, v]) =>
      v === undefined
        ? url.searchParams.delete(k)
        : url.searchParams.set(k, String(v)),
    );
    history.replaceState(null, "", url);
  }, [query, props.syncUrlQuery?.enabled]);
  const columns = [...baseColumns]
    .sort((a, b) => {
      const ai = order.indexOf(a.name),
        bi = order.indexOf(b.name);
      return (
        (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
    })
    .filter((c) => visible[c.name] !== false);
  const ctx = {
    tableName: props.tableName,
    data,
    invalidateRows: () => {
      void qc.invalidateQueries({ queryKey: [props.tableName] });
    },
  };
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / query.per_page));
  function rowId(row: TRow, index: number) {
    return (
      props.rowSelection?.getRowId?.(row, index) ?? String(row.id ?? index)
    );
  }
  function sort(name: string) {
    if (!props.sortable?.includes(name)) return;
    setQuery((q) => ({
      ...q,
      page: 1,
      sort_col: name,
      sort_dir:
        q.sort_col !== name ? "asc" : q.sort_dir === "asc" ? "desc" : undefined,
    }));
  }
  async function save() {
    await apiFetch(`/api/table-options/${props.tableName}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visible, order, query }),
    });
    settingsRef.current?.close();
  }
  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        {props.toolbar?.leftSlot?.(ctx)}
        {props.toolbar?.search?.enabled && (
          <input
            className={`${ui("input")} ${styles.search}`}
            placeholder={props.toolbar.search.placeholder ?? "Поиск"}
            value={query.search}
            onChange={(e) =>
              setQuery((q) => ({ ...q, page: 1, search: e.target.value }))
            }
          />
        )}{" "}
        {props.toolbar?.settingsButton?.enabled && (
          <button
            className={ui("secondary")}
            onClick={() => settingsRef.current?.showModal()}
          >
            Настроить
          </button>
        )}
        {props.toolbar?.extraButtons?.map((b) => (
          <span key={b.key}>{b.render(ctx)}</span>
        ))}
      </div>
      <div className={styles.wrap}>
        {rowsQuery.isPending ? (
          <div className={styles.loading}>Загрузка…</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {props.rowSelection?.enabled && (
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        Boolean(data?.rows.length) &&
                        selected.size === data?.rows.length
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? new Set(data?.rows.map(rowId))
                            : new Set(),
                        )
                      }
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.name}>
                    <button onClick={() => sort(c.name)}>
                      {c.label}
                      {query.sort_col === c.name
                        ? query.sort_dir === "desc"
                          ? " ↓"
                          : " ↑"
                        : ""}
                    </button>
                  </th>
                ))}
                {props.actionCell && <th>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row, i) => (
                <tr
                  className={styles.row}
                  key={rowId(row, i)}
                  onClick={() => props.onRowClick?.(row)}
                >
                  {props.rowSelection?.enabled && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(rowId(row, i))}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelected((s) => {
                            const n = new Set(s);
                            e.target.checked
                              ? n.add(rowId(row, i))
                              : n.delete(rowId(row, i));
                            return n;
                          });
                        }}
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.name}>
                      {props.formatCellValue?.(row[c.name], c, row) ??
                        String(row[c.name] ?? "—")}
                    </td>
                  ))}
                  {props.actionCell && (
                    <td onClick={(e) => e.stopPropagation()}>
                      {props.actionCell(ctx, row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!rowsQuery.isPending && !data?.rows.length && (
          <div className={styles.loading}>
            {props.emptyMessage ?? "Нет данных"}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <span>
          Всего: {data?.total ?? 0}
          {selected.size ? ` · выбрано: ${selected.size}` : ""}
        </span>
        <div className={styles.pager}>
          <select
            className={ui("input")}
            value={query.per_page}
            onChange={(e) =>
              setQuery((q) => ({
                ...q,
                page: 1,
                per_page: Number(e.target.value),
              }))
            }
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <button
            className={ui("secondary")}
            disabled={query.page <= 1}
            onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
          >
            ←
          </button>
          <span>
            {query.page} / {pageCount}
          </span>
          <button
            className={ui("secondary")}
            disabled={query.page >= pageCount}
            onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
          >
            →
          </button>
        </div>
      </div>
      <dialog ref={settingsRef} className={styles.dialog}>
        <div className={styles.settings}>
          <b>{props.toolbar?.settingsButton?.title ?? "Настройки таблицы"}</b>
          {baseColumns.map((c) => (
            <label key={c.name}>
              <input
                type="checkbox"
                checked={
                  (visible[c.name] ?? settings.data?.visible?.[c.name]) !==
                  false
                }
                disabled={props.persistColumns?.includes(c.name)}
                onChange={(e) =>
                  setVisible((v) => ({ ...v, [c.name]: e.target.checked }))
                }
              />{" "}
              {c.label}
            </label>
          ))}
          <div className={ui("actions")}>
            <button className={ui("primary")} onClick={save}>
              Сохранить
            </button>
            <button
              className={ui("secondary")}
              onClick={() => settingsRef.current?.close()}
            >
              Отмена
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
