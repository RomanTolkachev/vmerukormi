import { useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { TextButton } from "@/shared/ui/kit/buttons/TextButton";
import { Checkbox } from "@/shared/ui/kit/inputs/Checkbox";
import { TextInput } from "@/shared/ui/kit/inputs/TextInput";
import { List } from "@/shared/ui/kit/list/List";
import { ListItem } from "@/shared/ui/kit/list/ListItem";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { useDesign } from "@/shared/ui/kit/theme/desktop/useDesign";
import { ChevronDownIcon } from "@/shared/ui/kit/Icons/ChevronDownIcon";
import { ChevronUpIcon } from "@/shared/ui/kit/Icons/ChevronUpIcon";
import { ColumnPinningIcon } from "@/shared/ui/kit/Icons/ColumnPinningIcon";
import type { UniversalTableSettingsOpenPayload } from "@/shared/ui/kit/universal-table/types";
import { canResizeColumn } from "@/shared/ui/kit/universal-table/lib/resize";
import { toggleColumnPinning } from "@/shared/ui/kit/universal-table/lib/columnPinning";
import styles from "@/shared/ui/kit/universal-table/ui/TableSettingsPanel.module.css"

import { TableQuerySettings } from "@/shared/ui/kit/universal-table/ui/TableQuerySettings";

export function TableSettingsPanel({ settings, cardsAvailable, resizeColumns, showColumns = true, saving, sortableColumns }: {
  settings: UniversalTableSettingsOpenPayload; cardsAvailable: boolean; resizeColumns: boolean | readonly string[]; showColumns?: boolean
  saving: boolean; sortableColumns: readonly string[]
}) {
  const design = useDesign()
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)
  const { columns, update } = settings
  const isCardsView = cardsAvailable && columns.view === 'cards'
  const order = columns.order.filter(id => settings.columnIds.includes(id))
  const filteredOrder = order.filter(id => `${settings.columnLabels[id] ?? id}`.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')))
  const hasWidths = order.some(id => canResizeColumn(resizeColumns, id))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const move = (id: string, direction: number) => {
    const index = order.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return
    update({ ...columns, order: arrayMove(order, index, target) })
  }
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false)
    if (!over || active.id === over.id) return
    const from = order.indexOf(String(active.id))
    const to = order.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    update({ ...columns, order: arrayMove(order, from, to) })
  }
  return <div className={styles.root} onKeyDownCapture={event => {
    // The first Escape cancels sorting; the next one can close the popup.
    if (dragging && event.key === 'Escape') event.preventDefault()
  }}>
    <div className={styles.actions} role="group" aria-label="Вид реестра">
      <TextButton size="md" variant={design === 'uup' && !isCardsView ? undefined : 'compact'} aria-pressed={!isCardsView} disabled={saving} onClick={() => update({ ...columns, view: 'table' })}>
        Таблица
      </TextButton>
      <TextButton size="md" variant={design === 'uup' && isCardsView ? undefined : 'compact'} aria-pressed={isCardsView} disabled={!cardsAvailable || saving} title={!cardsAvailable ? 'Карточный вид для этого реестра не задан' : undefined} onClick={() => update({ ...columns, view: 'cards' })}>
        Карточки
      </TextButton>
    </div>
    <Checkbox size="sm" label="Компактное отображение" checked={columns.compact ?? false} disabled={saving} onChange={event => update({ ...columns, compact: event.target.checked })} />
    <TableQuerySettings sortableColumns={sortableColumns} columnLabels={settings.columnLabels} disabled={saving} />
    {showColumns && !isCardsView && <>
      <TextInput size="sm" placeholder="Найти колонку" aria-label="Найти колонку" value={search} disabled={saving} onChange={event => setSearch(event.target.value)} />
      <div className={styles.columnHeading}>
        <Typography variant="body3" component="span" color="muted">Порядок и видимость колонок</Typography>
        {hasWidths && <Typography variant="body3" component="span" color="muted">Ширина, px</Typography>}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setDragging(true)} onDragCancel={() => setDragging(false)} onDragEnd={handleDragEnd}
        accessibility={{ screenReaderInstructions: { draggable: 'Чтобы переместить колонку, нажмите пробел, затем стрелки вверх или вниз. Пробел завершает перенос, Escape отменяет.' } }}>
        <SortableContext items={filteredOrder} strategy={verticalListSortingStrategy}>
          <List className={styles.columnList} dense>
            {filteredOrder.map(id => <SettingsColumn key={id} id={id} label={settings.columnLabels[id] ?? id}
              index={order.indexOf(id)} count={order.length} disabled={saving}
              visible={columns.visible[id] !== false} visibilityLocked={settings.persistColumns.includes(id)}
              hasWidths={hasWidths} resizable={canResizeColumn(resizeColumns, id)} width={Math.round(columns.resized[id] ?? 150)}
              onMove={direction => move(id, direction)}
              onVisibilityChange={visible => update({ ...columns, visible: { ...columns.visible, [id]: visible } })}
              onWidthChange={width => update({ ...columns, resized: { ...columns.resized, [id]: width } })}
              pinnedSide={columns.pinned?.left?.includes(id) ? 'left' : columns.pinned?.right?.includes(id) ? 'right' : undefined}
              onPin={side => update(toggleColumnPinning(columns, id, side))}
            />)}
          </List>
        </SortableContext>
      </DndContext>
      {filteredOrder.length === 0 && <Typography variant="body3" color="muted">Колонки не найдены</Typography>}
    </>}
  </div>
}

type TSettingsColumnProps = {
  id: string; label: string; index: number; count: number
  disabled: boolean; visible: boolean; visibilityLocked: boolean
  hasWidths: boolean; resizable: boolean; width: number
  onMove: (direction: number) => void
  onVisibilityChange: (visible: boolean) => void
  onWidthChange: (width: number) => void
  pinnedSide?: 'left' | 'right'
  onPin: (side: 'left' | 'right') => void
}

function SettingsColumn({ id, label, index, count, disabled, visible, visibilityLocked, hasWidths, resizable, width, onMove, onVisibilityChange, onWidthChange, pinnedSide, onPin }: TSettingsColumnProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return <ListItem className={`${styles.listItem} ${isDragging ? styles.dragging : ''}`} disableGutters>
    <div ref={setNodeRef} data-column-id={id} className={styles.column} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className={styles.moves}>
        <IconButton ref={setActivatorNodeRef} size="sm" variant="transparent" buttonClassName={styles.dragHandle}
          icon={<span className={styles.grip} aria-hidden="true" />} aria-label={`Перетащить колонку ${label}`} title="Перетащить колонку"
          disabled={disabled} {...attributes} {...listeners} />
        <IconButton size="sm" variant="transparent" wrapperClassName={styles.orderControl} buttonClassName={styles.orderButton} icon={<ChevronUpIcon />} disabled={disabled || index === 0} aria-label={`Поднять колонку ${label}`} onClick={() => onMove(-1)} />
        <IconButton size="sm" variant="transparent" wrapperClassName={styles.orderControl} buttonClassName={styles.orderButton} icon={<ChevronDownIcon />} disabled={disabled || index === count - 1} aria-label={`Опустить колонку ${label}`} onClick={() => onMove(1)} />
      </div>
      <Checkbox size="sm" checked={visible} disabled={disabled || visibilityLocked} aria-label={`${visible ? 'Скрыть' : 'Показать'} колонку ${label}`} onChange={event => onVisibilityChange(event.target.checked)} />
      <Typography variant="body3" component="span" noWrap title={label}>{label}</Typography>
      <div className={styles.pinning}>
        {(['left', 'right'] as const).map(side => {
          const pinned = pinnedSide === side
          const direction = side === 'left' ? 'слева' : 'справа'
          const action = pinned ? 'Открепить' : 'Закрепить'
          return <IconButton key={side} size="sm" variant="transparent" buttonClassName={styles.pinButton}
            icon={<ColumnPinningIcon side={side} pinned={pinned} />} disabled={disabled || !visible}
            aria-label={`${action} колонку ${label} ${direction}`} aria-pressed={pinned}
            title={`${action} ${direction}`} onClick={() => onPin(side)} />
        })}
      </div>
      {hasWidths && <div className={styles.width}>
        {resizable && <ColumnWidthInput label={label} width={width} disabled={disabled} onChange={onWidthChange} />}
      </div>}
    </div>
  </ListItem>
}

function ColumnWidthInput({ label, width, disabled, onChange }: { label: string; width: number; disabled: boolean; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return <TextInput size="sm" type="number" min={80} max={2000} step={1} aria-label={`Ширина колонки ${label}`}
    value={draft ?? width} disabled={disabled}
    onChange={event => {
      const value = event.target.value
      setDraft(value)
      const next = Number(value)
      if (Number.isInteger(next) && next >= 80 && next <= 2000) onChange(next)
    }}
    onBlur={() => setDraft(null)}
  />
}

