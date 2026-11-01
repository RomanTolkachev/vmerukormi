import { Fragment, type ReactNode } from 'react'
import styles from "@/shared/ui/kit/universal-table/ui/TableCards.module.css"

export function TableCards<TRow>({ rows, getRowId, render }: {
  rows: TRow[]; getRowId: (row: TRow, index: number) => string
  render: (row: TRow) => ReactNode
}) {
  return <div className={styles.scroll}>
    <div className={styles.grid}>
      {rows.map((row, index) => <Fragment key={getRowId(row, index)}>
        {render(row)}
      </Fragment>)}
    </div>
  </div>
}

