import { BusyRegion } from "@/shared/ui/loading";
import { ui } from "@/shared/ui/styles";

export default function Loading() {
  return <BusyRegion busy label="Загружаем страницу…" className={ui("pageLayout")} />;
}
