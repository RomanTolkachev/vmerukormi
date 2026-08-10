import type { ReactNode } from "react";

export type TableBaseQuery = { page: number; per_page: number; search: string; sort_col?: string; sort_dir?: "asc" | "desc" };
export type UniversalTableColumnMeta = { name: string; label: string; visible?: boolean; sort_order?: number; type?: string };
export type UniversalTableListResponse<TRow = Record<string, unknown>> = { rows: TRow[]; total: number; columns: UniversalTableColumnMeta[]; page?: number; per_page?: number };
export type UniversalTableActionContext<TResponse> = { tableName: string; data?: TResponse; invalidateRows: () => void };
export type UniversalTableProps<TRow extends Record<string, unknown>, TQuery extends TableBaseQuery, TResponse extends UniversalTableListResponse<TRow>> = {
  tableName: string;
  queryFn: (query: TQuery) => Promise<TResponse>;
  defaults?: Partial<TQuery>;
  sortable?: readonly string[];
  persistColumns?: readonly string[];
  syncUrlQuery?: { enabled: boolean };
  rowSelection?: { enabled: boolean; getRowId?: (row: TRow, index: number) => string; maxSelected?: number };
  toolbar?: { search?: { enabled: boolean; placeholder?: string }; settingsButton?: { enabled: boolean; title?: string }; leftSlot?: (ctx: UniversalTableActionContext<TResponse>) => ReactNode; extraButtons?: { key: string; render: (ctx: UniversalTableActionContext<TResponse>) => ReactNode }[] };
  actionCell?: (ctx: UniversalTableActionContext<TResponse>, row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  formatCellValue?: (value: unknown, column: UniversalTableColumnMeta, row: TRow) => ReactNode;
  emptyMessage?: ReactNode;
};
