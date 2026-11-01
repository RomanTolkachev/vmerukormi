import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { TextButton } from "@/shared/ui/kit/buttons/TextButton";
import { RiMenuLine } from '@remixicon/react'
import { notify } from "@/shared/ui/kit/AppToast/notify";
import { useDesign } from "@/shared/ui/kit/theme/desktop/useDesign";
import { useTableQuery } from "@/shared/ui/kit/universal-table/api/TableQueryFormProvider";
import { TableSearchBarField } from "@/shared/ui/kit/universal-table/TableSearchBarField";
import { TablePopup } from "@/shared/ui/kit/universal-table/ui/TablePopup";
import { TableAppliedFilters } from "@/shared/ui/kit/universal-table/ui/TableAppliedFilters";
import { TableSettingsPanel } from "@/shared/ui/kit/universal-table/ui/TableSettingsPanel";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { createUniversalTableSavedQuery, readUniversalTableSavedQuery } from "@/shared/ui/kit/universal-table/table-settings/savedState";
import { isEqualByJson } from "@/shared/ui/kit/universal-table/table-settings/lib/equals";
import { getTableListSettings } from "@/shared/ui/kit/universal-table/lib/listSettings";
import { hasNonDefaultFilters } from "@/shared/ui/kit/universal-table/lib/hasNonDefaultFilters";
import { applySortToQuery } from "@/shared/ui/kit/universal-table/lib/sort";
import { useToolbarSlotOverflow } from "@/shared/ui/kit/universal-table/hooks/useToolbarSlotOverflow";
import type { TableBaseQuery, UniversalTableSettingsOpenPayload, UniversalTableToolbarConfig } from "@/shared/ui/kit/universal-table/types";
import styles from "@/shared/ui/kit/universal-table/TableToolbar.module.css"

const FILTERS_HINT = 'Применены фильтры, отличающиеся от стандартных'

type Props<TQuery extends TableBaseQuery> = {
  config: Pick<UniversalTableToolbarConfig<never, TQuery>, 'search' | 'settingsButton' | 'filtersButton'>
  disabled?: boolean
  settings: UniversalTableSettingsOpenPayload | null
  sortableColumns: readonly string[]
  inlineSlot?: ReactNode; bottomSlot?: ReactNode; extraButtons?: ReactNode
  cardsAvailable: boolean; resizeColumns: boolean | readonly string[]
}

export function TableToolbar<TQuery extends TableBaseQuery>({ config, disabled, settings, sortableColumns, inlineSlot, bottomSlot, extraButtons, cardsAvailable, resizeColumns }: Props<TQuery>) {
  const design = useDesign()
  const buttonVariant = design === 'uup' ? undefined : 'ghost'
  const { committed, defaults, resetForm, revertToCommitted, replaceDraft, getValues } = useTableQuery<TQuery>()
  const [open, setOpen] = useState<'settings' | 'filters' | 'overflow' | null>(null)
  const [saving, setSaving] = useState(false)
  const controlsDisabled = disabled || saving
  const panel = useRef<HTMLDivElement>(null)
  const actions = useRef<HTMLDivElement>(null)
  const inlineMount = useRef<HTMLDivElement>(null)
  const popupMount = useRef<HTMLDivElement>(null)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const filtersButton = useRef<HTMLButtonElement>(null)
  const settingsAnchor = useRef<HTMLSpanElement>(null)
  const filtersAnchor = useRef<HTMLSpanElement>(null)
  const filtersHintId = useId()
  const burger = useRef<HTMLButtonElement>(null)
  // The same mounted entity components move between the row and the popup.
  const [slotHost] = useState(() => typeof document === 'undefined' ? null : document.createElement('div'))
  const hasSlot = Boolean(inlineSlot)
  const hasSearch = config.search?.enabled === true
  const overflowing = useToolbarSlotOverflow({ panel, actions, content: hasSlot ? slotHost : null, search: hasSearch })
  const close = useCallback(() => {
    if (saving) return
    if (open === 'filters') revertToCommitted()
    setOpen(null)
  }, [open, revertToCommitted, saving])
  useLayoutEffect(() => {
    if (!slotHost) return
    const popupTarget = open === 'overflow' && overflowing ? popupMount.current : null
    const target = popupTarget ?? inlineMount.current
    if (target) target.appendChild(slotHost)
    slotHost.setAttribute('class', popupTarget ? styles.popupSlot : styles.slotContent)
    slotHost.toggleAttribute('inert', saving || (overflowing && !popupTarget))
  }, [slotHost, overflowing, open, saving])
  useLayoutEffect(() => () => { slotHost?.remove() }, [slotHost])
  const mountPopupSlot = useCallback((node: HTMLDivElement | null) => {
    popupMount.current = node
    if (!node || !slotHost) return
    node.appendChild(slotHost)
    slotHost.setAttribute('class', styles.popupSlot)
    slotHost.removeAttribute('inert')
  }, [slotHost])

  const filtersPanel = config.filtersButton?.render ?? config.settingsButton?.filtersPanel
  const searchKey = config.search?.name ?? 'search' as Extract<keyof TQuery, string>
  const filtersChanged = hasNonDefaultFilters(committed, defaults, searchKey)
  const listSettings = getTableListSettings(committed, sortableColumns)
  const savedListSettings = getTableListSettings({...defaults, ...readUniversalTableSavedQuery(settings?.savedQuery, searchKey)}, sortableColumns)
  const hasSettingsChanges = settings?.hasDisplayChanges || !isEqualByJson(listSettings, savedListSettings)
  const saveSettings = async () => {
    if (!settings || saving || !hasSettingsChanges) return
    setSaving(true)
    try {
      await settings.saveDisplay(createUniversalTableSavedQuery({...committed, ...listSettings}, searchKey))
      notify.success('Настройки отображения сохранены')
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки') }
    finally { setSaving(false) }
  }
  const resetSettings = () => {
    settings?.update(settings.defaults)
    resetForm({...committed, ...getTableListSettings(defaults, sortableColumns), page: 1})
  }
  const openFilters = () => {
    if (open === 'filters') { close(); return }
    revertToCommitted()
    setOpen('filters')
  }
  const getNextQuery = () => applySortToQuery({ ...getValues(), page: 1 }, sortableColumns)
  const applyFilters = () => { resetForm(getNextQuery()); setOpen(null) }
  const saveFilters = async () => {
    if (!settings) return
    const next = getNextQuery()
    setSaving(true)
    try {
      await settings.saveQuery(createUniversalTableSavedQuery(next, searchKey))
      resetForm(next)
      setOpen(null)
      notify.success('Фильтры сохранены')
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Не удалось сохранить фильтры') }
    finally { setSaving(false) }
  }
  return <div className={styles.root}>
    <div className={styles.topScroll}>
      <div className={styles.topRow} ref={panel}>
        {hasSearch && <div className={styles.search}><TableSearchBarField<TQuery> name={searchKey} placeholder={config.search?.placeholder} disabled={controlsDisabled} /></div>}
        <div ref={inlineMount} className={overflowing ? styles.hiddenSlot : styles.inlineSlot} aria-hidden={overflowing || undefined} />
        {hasSlot && slotHost && createPortal(inlineSlot, slotHost)}
        <div className={styles.actions}>
          {hasSlot && overflowing && <IconButton ref={burger} disabled={controlsDisabled} size="md" variant="ghost" icon={<RiMenuLine />} aria-label="Дополнительные действия" aria-haspopup="dialog" aria-expanded={open === 'overflow'} onClick={() => setOpen(open === 'overflow' ? null : 'overflow')} />}
          <div ref={actions} className={styles.fixedActions}>
            {extraButtons}
            <span ref={filtersAnchor} className={styles.popupAnchor}>
              <TextButton ref={filtersButton} className={styles.filtersButton} variant={buttonVariant} touchEffect howerEffect disabled={controlsDisabled}
                aria-label="Фильтры" aria-describedby={filtersChanged ? filtersHintId : undefined} aria-haspopup="dialog" aria-expanded={open === 'filters'} onClick={openFilters}>
                Фильтры
                {filtersChanged && <Typography component="span" variant="body3" className={styles.filtersBadge}
                  id={filtersHintId} role="img" aria-label={FILTERS_HINT} title={FILTERS_HINT}>!</Typography>}
              </TextButton>
            </span>
            {config.settingsButton?.enabled && settings && <span ref={settingsAnchor} className={styles.popupAnchor}>
              <TextButton ref={settingsButton} variant={buttonVariant} touchEffect howerEffect disabled={controlsDisabled} aria-haspopup="dialog" aria-expanded={open === 'settings'} onClick={() => { revertToCommitted(); setOpen(open === 'settings' ? null : 'settings') }}>Настройки</TextButton>
            </span>}
          </div>
        </div>
      </div>
    </div>
    {bottomSlot && <div className={styles.bottomSlot} inert={saving}>{bottomSlot}</div>}
    <TableAppliedFilters<TQuery> searchKey={searchKey} hasSearch={hasSearch}
      applied={config.filtersButton?.applied} labels={settings?.columnLabels ?? {}} disabled={controlsDisabled} />
    {open === 'settings' && settings && <TablePopup anchor={settingsButton} positionAnchor={settingsAnchor} title={config.settingsButton?.title ?? 'Настройки'} onClose={close} fixedHeight footer={<>
      <Typography variant="body3" component="span" color="muted">Изменения отображаются сразу. Для следующего открытия сохраните настройки.</Typography>
      <div className={styles.popupActions}>
        <TextButton disabled={saving || !hasSettingsChanges} onClick={() => void saveSettings()}>{saving ? 'Сохранение…' : 'Сохранить настройки'}</TextButton>
        <TextButton disabled={saving} onClick={resetSettings}>Стандартное отображение</TextButton>
      </div>
    </>}>
      <TableSettingsPanel settings={settings} cardsAvailable={cardsAvailable} resizeColumns={resizeColumns} sortableColumns={sortableColumns} saving={saving} showColumns={config.settingsButton?.visibilityBar !== false} />
    </TablePopup>}
    {open === 'filters' && <TablePopup anchor={filtersButton} positionAnchor={filtersAnchor} title="Фильтры" onClose={close} fixedHeight footer={
      <div className={styles.popupActions}>
        <TextButton disabled={saving} onClick={() => replaceDraft({ ...defaults, ...listSettings, search: committed.search, [searchKey]: committed[searchKey] })}>Сбросить</TextButton>
        <TextButton disabled={saving || !settings} onClick={() => void saveFilters()}>{saving ? 'Сохранение…' : 'Сохранить фильтры'}</TextButton>
        <TextButton disabled={saving} onClick={applyFilters}>Применить</TextButton>
      </div>
    }>
      <fieldset className={styles.filters} disabled={saving}>
        {filtersPanel?.()}
      </fieldset>
    </TablePopup>}
    {open === 'overflow' && overflowing && <TablePopup anchor={burger} title="Дополнительные действия" onClose={close}><div ref={mountPopupSlot} /></TablePopup>}
  </div>
}

