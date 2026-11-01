import type {ColumnPinningState, VisibilityState} from '@tanstack/react-table'
import type { IColumnsConfig } from "@/shared/ui/kit/universal-table/table-settings/types";

/** Pinned groups follow the settings order; hidden and removed columns cannot remain pinned. */
export function normalizeColumnPinning(
  pinned: ColumnPinningState | undefined,
  order: readonly string[],
  visible: VisibilityState = {},
): Required<ColumnPinningState> {
  const left = new Set(Array.isArray(pinned?.left) ? pinned.left : [])
  const right = new Set(Array.isArray(pinned?.right) ? pinned.right : [])
  const available = [...new Set(order)].filter(id => visible[id] !== false)
  return {
    left: available.filter(id => left.has(id)),
    right: available.filter(id => right.has(id) && !left.has(id)),
  }
}

export function toggleColumnPinning(columns: IColumnsConfig, id: string, side: 'left' | 'right'): IColumnsConfig {
  if (!columns.order.includes(id) || columns.visible[id] === false) return columns
  const pinned = normalizeColumnPinning(columns.pinned, columns.order, columns.visible)
  const unpin = pinned[side].includes(id)
  const next = {left: pinned.left.filter(key => key !== id), right: pinned.right.filter(key => key !== id)}
  if (!unpin) next[side].push(id)
  return {...columns, pinned: normalizeColumnPinning(next, columns.order, columns.visible)}
}

export function getPinnedColumnOrder(order: readonly string[], pinned: ColumnPinningState | undefined): string[] {
  const {left, right} = normalizeColumnPinning(pinned, order)
  const fixed = new Set([...left, ...right])
  return [...left, ...order.filter(id => !fixed.has(id)), ...right]
}

