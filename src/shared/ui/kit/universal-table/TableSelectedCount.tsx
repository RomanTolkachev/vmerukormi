import { Typography } from "@/shared/ui/kit/typography/Typography";
import { useSelection } from "@/shared/ui/kit/universal-table/api/TableSelectionProvider";
import type { UniversalTableSelectedCountConfig } from "@/shared/ui/kit/universal-table/types";

type TableSelectedCountProps = UniversalTableSelectedCountConfig

export function TableSelectedCount({render}: TableSelectedCountProps) {
  const {count} = useSelection()

  return render?.({count}) ?? (
    <Typography variant="body3" component="span">
      Выбрано: {count}
    </Typography>
  )
}

