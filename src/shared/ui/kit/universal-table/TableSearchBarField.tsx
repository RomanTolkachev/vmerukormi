import { useState } from 'react'
import { useTableQuery } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import { TableSearchBar } from "@/shared/ui/kit/universal-table/TableSearchBar";
import type { TableBaseQuery } from "@/shared/ui/kit/universal-table/types";

export function TableSearchBarField<TQuery extends TableBaseQuery>({ name = 'search' as Extract<keyof TQuery, string>, placeholder, disabled }: {
  name?: Extract<keyof TQuery, string>; placeholder?: string; disabled?: boolean
}) {
  const { committed, resetForm } = useTableQuery<TQuery>()
  const applied = String(committed[name] ?? '')
  const [value, setValue] = useState(applied)
  const [previousApplied, setPreviousApplied] = useState(applied)
  if (previousApplied !== applied) { setPreviousApplied(applied); setValue(applied) }
  const apply = (next: string) => { setValue(next); resetForm({ ...committed, [name]: next, page: 1 }) }
  return <TableSearchBar value={value} onChange={setValue} onApply={() => apply(value.trim())} onClear={() => apply('')}
    canApply={value.trim() !== applied.trim()} canClear={value !== '' || applied !== ''} placeholder={placeholder} disabled={disabled} />
}

