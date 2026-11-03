import { notify } from "@/shared/ui/notifications";
import { TextButton } from "@/shared/ui/kit/buttons/TextButton";
import { Typography } from "@/shared/ui/kit/typography/Typography";
import { cancelSettingsReminder, shouldShowSettingsReminder, type TableSettingsReminderKind } from "@/shared/ui/kit/universal-table/lib/settingsReminderPreferences";
import styles from "@/shared/ui/kit/universal-table/ui/TableSettingsReminder.module.css"

const MESSAGES: Record<TableSettingsReminderKind, string> = {
  sort: 'Чтобы выбранная сортировка сохранялась для этой таблицы, откройте «Настройки» и нажмите «Сохранить настройки».',
  perPage: 'Чтобы выбранное количество записей сохранялось для этой таблицы, откройте «Настройки» и нажмите «Сохранить настройки».',
}

export function showTableSettingsReminder(kind: TableSettingsReminderKind): void {
  if (!shouldShowSettingsReminder(kind)) return
  // Повторные изменения обновляют одно уведомление, а не накапливают одинаковые.
  const id = `table-settings-reminder:${kind}`
  notify.info(<div className={styles.content}>
    <Typography variant="body2" component="p">{MESSAGES[kind]}</Typography>
    <TextButton variant="compact" className={styles.dismiss} onClick={() => {
      cancelSettingsReminder(kind)
      notify.dismiss(id)
    }}>Больше не показывать</TextButton>
  </div>, {id})
}

