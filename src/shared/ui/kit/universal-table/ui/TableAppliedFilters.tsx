import { Chip } from "@/shared/ui/kit/chip/Chip";
import { useTableQuery } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import type { TableBaseQuery, UniversalTableAppliedFilter, UniversalTableFiltersConfig } from "@/shared/ui/kit/universal-table/types";
import styles from "@/shared/ui/kit/universal-table/TableToolbar.module.css"

type Props<TQuery extends TableBaseQuery> = {
  searchKey: Extract<keyof TQuery, string>
  hasSearch: boolean
  applied?: UniversalTableFiltersConfig<TQuery>['applied']
  labels: Record<string, string>
  disabled?: boolean
}

export function TableAppliedFilters<TQuery extends TableBaseQuery>({
  searchKey, hasSearch, applied, labels, disabled,
}: Props<TQuery>) {
  const {committed, defaults, resetForm} = useTableQuery<TQuery>()
  const chips = [...(applied?.(committed, defaults) ?? fallbackChips(committed, defaults, labels, searchKey))]
  const searchValue = String(committed[searchKey] ?? '')
  if (hasSearch && searchValue) {
    chips.unshift({key: searchKey, label: `Поиск: ${searchValue}`, fields: [searchKey]})
  }

  const remove = (fields: readonly Extract<keyof TQuery, string>[]) => {
    const next = {...committed, page: 1}
    for (const key of fields) next[key] = defaults[key]
    resetForm(next)
  }

  if (chips.length === 0) return null

  return (
    <div className={styles.chipRow} aria-label="Применённые фильтры">
      <div className={styles.chips}>
        {chips.map(chip => (
          <Chip
            key={chip.key}
            size="sm"
            title={chip.label}
            onRemove={() => remove(chip.fields)}
            removeLabel={`Снять фильтр: ${chip.label}`}
            removeDisabled={disabled}
          >
            {chip.label}
          </Chip>
        ))}
      </div>
      <div className={styles.clearSlot}>
        {chips.length > 0 && (
          <Chip
            size="sm"
            className={styles.clearChip}
            title="Сбросить все фильтры"
            removeLabel="Сбросить все фильтры"
            removeDisabled={disabled}
            onRemove={() => remove(chips.flatMap(chip => chip.fields))}
          />
        )}
      </div>
    </div>
  )
}

function fallbackChips<TQuery extends TableBaseQuery>(
  query: TQuery, defaults: TQuery, labels: Record<string, string>, searchKey: string,
): UniversalTableAppliedFilter<TQuery>[] {
  const reserved = new Set(['page', 'per_page', 'search', searchKey, 'sort_col', 'sort_dir'])
  return Object.keys(query).filter(key => !reserved.has(key)).flatMap(rawKey => {
    const key = rawKey as Extract<keyof TQuery, string>
    const value = query[key]
    if (value == null || value === '' || JSON.stringify(value) === JSON.stringify(defaults[key])) return []
    const text = Array.isArray(value) ? value.join(', ') : String(value)
    return [{key, label: `${labels[key] ?? key}: ${text}`, fields: [key]}]
  })
}

