"use client";

import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UniversalTable, type UniversalTableColumnMeta, type UniversalTableProps } from "../universal-table";
import { ui } from "../styles";

export function LocalRegistry<Row extends Record<string, unknown>>({ rows, columns, tableName, createButton, ...props }: {
  rows: Row[]; columns: UniversalTableColumnMeta[]; tableName: string; createButton?: ReactNode;
} & Pick<UniversalTableProps<Row>, "actionCell" | "actionCellWidth" | "columnSizeData" | "formatCellValue" | "customColumns">) {
  const client = useQueryClient();
  useEffect(() => { void client.invalidateQueries({ queryKey: [tableName] }); }, [client, rows, tableName]);
  return <UniversalTable<Row> {...props} formatCellValue={props.formatCellValue ?? ((_column, value) => typeof value === "number" ? <span className={ui("numericCell")}>{value.toLocaleString("ru-RU", { maximumSignificantDigits: 8 })}</span> : String(value ?? "—"))} tableName={tableName} getRowId={row => String(row.id)}
    sortable={columns.map(column => column.name)}
    toolbar={{ search: { enabled: true }, settingsButton: { enabled: true }, extraButtons: createButton ? [{ key: "create", render: () => createButton }] : [] }}
    cardsView={{ render: (context, row) => <article className={ui("registryCard")}>{columns.map(column => <p key={column.name}><b>{column.label}: </b>{props.formatCellValue?.(column.name, row[column.name]) ?? String(row[column.name] ?? "—")}</p>)}{props.actionCell?.(context, row)}</article> }}
    queryFn={async query => {
      const search = query.search?.trim().toLocaleLowerCase("ru") ?? "";
      let result = rows.filter(row => !search || columns.some(column => String(row[column.name] ?? "").toLocaleLowerCase("ru").includes(search)));
      const column = query.sort_col;
      if (column && query.sort_dir) result = [...result].sort((left, right) => {
        const first = left[column], second = right[column];
        const compared = typeof first === "number" && typeof second === "number" ? first - second : String(first ?? "").localeCompare(String(second ?? ""), "ru", { numeric: true });
        return compared * (query.sort_dir === "desc" ? -1 : 1);
      });
      const page = Math.min(Math.max(1, query.page), Math.max(1, Math.ceil(result.length / query.per_page)));
      return { rows: result.slice((page - 1) * query.per_page, page * query.per_page), columns, total: result.length, page, per_page: query.per_page };
    }} />;
}
