import { useState, type ReactNode } from 'react'
import { RiFileWord2Line } from '@remixicon/react'
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { ExcelIcon } from "@/shared/ui/kit/Icons/ExcelIcon";
import { PrintIcon } from "@/shared/ui/kit/Icons/PrintIcon";
import { notify } from "@/shared/ui/notifications";
import { useDesign } from "@/shared/ui/kit/theme/desktop/useDesign";
import { useSelectedIds } from "@/shared/ui/kit/universal-table/api/TableSelectionProvider";
import type { UniversalTableActionContext, UniversalTableDocumentSlot, UniversalTableListResponse } from "@/shared/ui/kit/universal-table/types";
import styles from "@/shared/ui/kit/universal-table/ui/TableDocumentActions.module.css"

type Props<TResponse extends UniversalTableListResponse> = {
  ctx: UniversalTableActionContext<TResponse>
  selectionEnabled: boolean
  disabled: boolean
  printSlot?: UniversalTableDocumentSlot<TResponse>
  excelSlot?: UniversalTableDocumentSlot<TResponse>
  wordSlot?: UniversalTableDocumentSlot<TResponse>
}

const EMPTY_SELECTION: readonly string[] = []

export function TableDocumentActions<TResponse extends UniversalTableListResponse>(props: Props<TResponse>) {
  if (!props.printSlot && !props.excelSlot && !props.wordSlot) return null
  return props.selectionEnabled
    ? <SelectedDocumentActions {...props} />
    : <DocumentActionGroup {...props} selectedIds={EMPTY_SELECTION} />
}

// Only the actions subscribe to selection; selecting a row does not rerender the table.
function SelectedDocumentActions<TResponse extends UniversalTableListResponse>(props: Props<TResponse>) {
  const selectedIds = useSelectedIds()
  return <DocumentActionGroup {...props} selectedIds={selectedIds} />
}

const DOCUMENT_ACTIONS = [
  { key: 'printSlot', label: 'Печать выбранных записей', Icon: PrintIcon },
  { key: 'excelSlot', label: 'Экспортировать выбранные записи в Excel', Icon: ExcelIcon },
  { key: 'wordSlot', label: 'Экспортировать выбранные записи в Word', Icon: RiFileWord2Line },
] as const

function DocumentActionGroup<TResponse extends UniversalTableListResponse>(props: Props<TResponse> & { selectedIds: readonly string[] }) {
  const { ctx, selectedIds } = props
  const disabledReason = ctx.tableState.view === 'cards'
    ? 'Печать и выгрузка доступны в табличном виде'
    : selectedIds.length === 0 ? 'Выберите строки в таблице' : props.disabled ? 'Дождитесь загрузки таблицы' : undefined
  const disabled = Boolean(disabledReason)

  // Native disabled also protects buttons supplied by a render slot.
  return <fieldset className={styles.actions} disabled={disabled} title={disabledReason} aria-label="Печать и выгрузка">
    {DOCUMENT_ACTIONS.map(action => {
      const slot = props[action.key]
      return slot ? <DocumentAction key={action.key} slot={slot} ctx={ctx} selectedIds={selectedIds}
        disabled={disabled} disabledReason={disabledReason} label={action.label}
        icon={<action.Icon aria-hidden="true" />} /> : null
    })}
  </fieldset>
}

function DocumentAction<TResponse extends UniversalTableListResponse>({ slot, ctx, selectedIds, disabled, disabledReason, label, icon }: {
  slot: UniversalTableDocumentSlot<TResponse>
  ctx: UniversalTableActionContext<TResponse>
  selectedIds: readonly string[]
  disabled: boolean
  disabledReason?: string
  label: string
  icon: ReactNode
}) {
  const [pending, setPending] = useState(false)
  const design = useDesign()
  if (typeof slot !== 'function') return slot.render(selectedIds, { ...ctx, disabled })

  const run = async () => {
    if (disabled || pending) return
    setPending(true)
    try { await slot(selectedIds, ctx) }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Не удалось выполнить действие') }
    finally { setPending(false) }
  }

  return <IconButton size="md" variant={design === 'uup' ? 'default' : 'ghost'} icon={icon} touchEffect
    aria-label={label} title={disabledReason ?? label} aria-busy={pending || undefined}
    disabled={disabled || pending} onClick={() => void run()} />
}

