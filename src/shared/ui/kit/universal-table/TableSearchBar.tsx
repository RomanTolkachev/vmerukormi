import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { TextInput } from "@/shared/ui/kit/inputs/TextInput";
import { RiCheckLine, RiCloseLine } from '@remixicon/react'
import styles from "@/shared/ui/kit/universal-table/TableSearchBar.module.css"

type Props = {
  className?: string; value: string; onChange: (value: string) => void; onApply: () => void
  onClear: () => void; canApply: boolean; canClear: boolean; placeholder?: string; disabled?: boolean
}
export function TableSearchBar({ className, value, onChange, onApply, onClear, canApply, canClear, placeholder = 'Поиск', disabled }: Props) {
  return <div className={[styles.root, className].filter(Boolean).join(' ')}>
    <TextInput className={styles.input} value={value} placeholder={placeholder} aria-label={placeholder} disabled={disabled}
      onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (canApply && !disabled) onApply() } }} />
    <div className={styles.actions}>
      <IconButton size="md" variant="transparent" icon={<RiCheckLine />} aria-label="Применить поиск" title="Применить поиск" disabled={disabled || !canApply} buttonClassName={styles.apply} onClick={onApply} />
      <IconButton size="md" variant="transparent" icon={<RiCloseLine />} aria-label="Очистить поиск" title="Очистить поиск" disabled={disabled || !canClear} buttonClassName={styles.clear} onClick={onClear} />
    </div>
  </div>
}

