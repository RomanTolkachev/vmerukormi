import type { ReactNode } from 'react'
import { PerPage } from "@/shared/ui/kit/universal-table/ordered-table/PerPage";
import { TablePaginationControls } from "@/shared/ui/kit/universal-table/ordered-table/TablePagination";
import styles from "@/shared/ui/kit/universal-table/ui/TableFooter.module.css"

export function TableFooter({ pageIndex, perPage, total, onPageChange, onPerPageChange, counter }: {
  pageIndex: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  onPerPageChange: (size: number) => void
  counter?: ReactNode
}) {
  return <div className={styles.root} role="group" aria-label="Пагинация реестра">
    <div className={styles.summary}>
      <PerPage value={perPage} onChange={onPerPageChange} />
      {counter && <div className={styles.counter} role="status" aria-label="Выбранные строки">{counter}</div>}
    </div>
    <TablePaginationControls pageIndex={pageIndex} pageCount={Math.ceil(total / perPage)} onPageChange={onPageChange} />
  </div>
}

