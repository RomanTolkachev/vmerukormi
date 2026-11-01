import type { IColumnsConfig } from "@/shared/ui/kit/universal-table/table-settings/types";
import { normalizeColumnPinning } from "@/shared/ui/kit/universal-table/lib/columnPinning";

/** Сравнивает отображение после согласования обоих конфигов с актуальными колонками. */
export function areDisplaySettingsEqual(current: IColumnsConfig, saved: IColumnsConfig): boolean {
  if ((current.view ?? 'table') !== (saved.view ?? 'table')) return false
  if ((current.compact ?? false) !== (saved.compact ?? false)) return false
  if (current.order.length !== saved.order.length) return false
  const currentPinned = normalizeColumnPinning(current.pinned, current.order, current.visible)
  const savedPinned = normalizeColumnPinning(saved.pinned, saved.order, saved.visible)
  if (JSON.stringify(currentPinned) !== JSON.stringify(savedPinned)) return false

  return current.order.every((id, index) =>
    id === saved.order[index]
    && (current.visible[id] !== false) === (saved.visible[id] !== false)
    && (current.resized[id] ?? 150) === (saved.resized[id] ?? 150),
  )
}

