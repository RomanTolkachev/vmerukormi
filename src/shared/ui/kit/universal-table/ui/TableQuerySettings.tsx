import { FieldLayout } from "@/shared/ui/kit/inputs/FieldLayout";
import { SelectInput } from "@/shared/ui/kit/inputs/SelectInput";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { useTableQuery } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import { getPerPageOptions } from "@/shared/ui/kit/universal-table/lib/perPage";
import { resolveTableSort } from "@/shared/ui/kit/universal-table/lib/sort";
import styles from "@/shared/ui/kit/universal-table/ui/TableQuerySettings.module.css"

const label = (value: string) => ({value, position: 'top' as const, fontSize: 'sm' as const})
const DIRECTIONS = [
  {value: 'asc', label: 'По возрастанию'},
  {value: 'desc', label: 'По убыванию'},
]

export function TableQuerySettings({ sortableColumns, columnLabels, disabled }: {
  sortableColumns: readonly string[]
  columnLabels: Record<string, string>
  disabled: boolean
}) {
  const { committed, resetForm } = useTableQuery()
  const perPage = committed.per_page
  const { sortCol, sortDir } = resolveTableSort(committed, sortableColumns)
  const options = [...new Set(sortableColumns)].map(id => ({value: id, label: columnLabels[id] ?? id}))
  const changeColumn = (value: string) => {
    resetForm({...committed, page: 1, sort_col: value || undefined, sort_dir: value ? sortDir ?? 'asc' : undefined})
  }

  return <section className={styles.root} aria-label="Сортировка и размер страницы">
    <div className={styles.fields}>
      <FieldLayout label={label('Сортировать по')} error={{show: 'never'}}>
        <SelectInput size="sm" name="sort_col" aria-label="Сортировать по" options={options}
          value={sortCol ?? ''} emptyLabel="Без сортировки" clearable={Boolean(sortCol)} searchable
          disabled={disabled || options.length === 0} onChange={changeColumn} />
      </FieldLayout>
      <FieldLayout label={label('Направление')} error={{show: 'never'}}>
        <SelectInput size="sm" name="sort_dir" aria-label="Направление" options={DIRECTIONS}
          value={sortDir ?? 'asc'} clearable={false} disabled={disabled || !sortCol}
          onChange={value => resetForm({...committed, page: 1, sort_dir: value === 'desc' ? 'desc' : 'asc'})} />
      </FieldLayout>
      <FieldLayout label={label('Строк на странице')} error={{show: 'never'}}>
        <SelectInput size="sm" name="per_page" aria-label="Строк на странице" options={getPerPageOptions()}
          value={String(perPage)} clearable={false} disabled={disabled}
          onChange={value => resetForm({...committed, page: 1, per_page: Number(value)})} />
      </FieldLayout>
    </div>
    {options.length === 0 && <Typography variant="body3" component="span" color="muted">Для этой таблицы нет доступных колонок сортировки.</Typography>}
  </section>
}

