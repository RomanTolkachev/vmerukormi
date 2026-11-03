import { ui } from "../styles";

export function Brand({ caption = "Ветеринарная диетология" }: { caption?: string }) {
  return <div className={ui("brand")}><span>Vet<span className={ui("brandSuffix")}>Energy</span></span><small>{caption}</small></div>;
}
