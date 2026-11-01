import Link from "next/link";
import type { FormulaModuleDetails } from "@/entities/module";
import { CreateVersionForm } from "@/features/edit-module";
import { LocalRegistry } from "@/shared/ui/local-registry";
import { ui } from "@/shared/ui/styles";

function displayDate(value: string) {
  if (value.startsWith("2399-12-31")) return "31.12.2399, 23:59:59";
  return new Date(value).toLocaleString("ru-RU");
}

export function FormulaModulePage({ module, canEdit }: { module: FormulaModuleDetails; canEdit: boolean }) {
  const latest = module.versions[0];
  return <div className={ui("pageLayout", "formulaVersionsPage")}>
    <header className={ui("productEditorHeader")}>
      <div><Link className={ui("backLink")} href="/modules">← Все формулы</Link><h1>{module.name}</h1><div className={ui("meta")}>{module.species === "CAT" ? "Кошка" : "Собака"} · {module.versions.length} версий</div></div>
      <span className={ui("badge")}>{module.archived ? "Архив" : "Активна"}</span>
    </header>
    <div className={ui("workspaceGridSingle")}>
      <section className={ui("card", "formulaTableCard")}>
        <div className={ui("cardHead")}><div><h2>Версии методики</h2><div className={ui("meta")}>Старые версии остаются привязаны к выполненным расчётам</div></div></div>
        <div className={ui("cardBody", "tableBody")}><LocalRegistry tableName={`formula-versions-${module.id}`} rows={module.versions.map(version => ({ id: version.id, formula: version.formula, description: version.description, techBegin: displayDate(version.techBegin), techEnd: displayDate(version.techEnd), status: version.current ? "Действует" : "История" }))} columns={[{ name: "formula", label: "Формула" }, { name: "description", label: "Описание" }, { name: "techBegin", label: "Начало" }, { name: "techEnd", label: "Окончание" }, { name: "status", label: "Статус" }]} /></div>
      </section>
      {canEdit && latest ? <aside><CreateVersionForm key={latest.id} moduleId={module.id} moduleName={module.name} latestFormula={latest.formula} latestDescription={latest.description} /></aside> : null}
    </div>
  </div>;
}
