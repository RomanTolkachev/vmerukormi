export type TableSettingsReminderKind = 'sort' | 'perPage'

const CANCELLATION_KEYS: Record<TableSettingsReminderKind, string> = {
  sort: 'orderNotivicationCancelled',
  perPage: 'perPageNotoficationCancelled',
}

// Если браузер запрещает запись, отключение всё равно работает до перезагрузки.
const cancelledInMemory = new Set<TableSettingsReminderKind>()

export function shouldShowSettingsReminder(kind: TableSettingsReminderKind): boolean {
  if (typeof window === 'undefined' || cancelledInMemory.has(kind)) return false
  try { return window.localStorage.getItem(CANCELLATION_KEYS[kind]) === null }
  catch { return true }
}

export function cancelSettingsReminder(kind: TableSettingsReminderKind): void {
  try { window.localStorage.setItem(CANCELLATION_KEYS[kind], 'true') }
  catch { cancelledInMemory.add(kind) }
}

