import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { FloatingPortal } from "@/shared/ui/kit/floating-portal/FloatingPortal";
import { useFloatingAnchorRect } from "@/shared/ui/kit/floating-portal/useFloatingAnchorRect";
import { useClickOutside } from "@/shared/ui/kit/hooks/useClickOutside";
import { IconButton } from "@/shared/ui/kit/buttons/IconButton";
import { CloseIcon } from "@/shared/ui/kit/Icons/CloseIcon";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import styles from "@/shared/ui/kit/universal-table/ui/TablePopup.module.css"

type Props = {
  anchor: RefObject<HTMLButtonElement | null>
  /** Неподвижная обёртка, если у кнопки есть hover/press transform. */
  positionAnchor?: RefObject<HTMLElement | null>
  title: string
  onClose: () => void
  children: ReactNode
  fixedHeight?: boolean
  footer?: ReactNode
}

export function TablePopup({ anchor, positionAnchor = anchor, title, onClose, children, fixedHeight = false, footer }: Props) {
  const popup = useRef<HTMLDivElement>(null)
  const rect = useFloatingAnchorRect(positionAnchor, true)
  const titleId = useId()
  useClickOutside(popup, onClose, true, anchor)
  const positioned = Boolean(rect)
  useLayoutEffect(() => { if (positioned) popup.current?.focus({ preventScroll: true }) }, [positioned])
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      // SelectInput consumes Escape before it reaches the document.
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onClose()
      anchor.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [anchor, onClose])
  if (!rect) return null
  const gap = 8
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const width = Math.min(35 * rootFontSize, window.innerWidth - 24)
  const below = window.innerHeight - rect.bottom - 20
  const above = rect.top - 20
  const upwards = below < 280 && above > below
  const height = Math.max(0, Math.min(42 * rootFontSize, window.innerHeight - 24, Math.max(280, upwards ? above : below)))
  const top = Math.max(12, Math.min(upwards ? rect.top - gap - height : rect.bottom + gap, window.innerHeight - height - 12))
  return (
    <FloatingPortal
      ref={popup}
      className={styles.popup}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={{
        background: 'var(--ui-input-background, var(--input-control-background))',
        backdropFilter: 'none', WebkitBackdropFilter: 'none',
        position: 'fixed', width, maxHeight: height, height: fixedHeight ? height : undefined,
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
        ...(fixedHeight ? {top} : upwards ? { bottom: Math.max(12, window.innerHeight - rect.top + gap) } : { top: rect.bottom + gap })
      }}
    >
      <div className={styles.header}>
        <Typography id={titleId} variant="header4" component="div">{title}</Typography>
        <IconButton size="sm" wrapperClassName={styles.close} variant="transparent" icon={<CloseIcon />} aria-label={`Закрыть: ${title}`} onClick={() => { onClose(); anchor.current?.focus() }} />
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </FloatingPortal>
  )
}

