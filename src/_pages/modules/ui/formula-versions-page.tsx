import type { FormulaVersion } from "@/entities/module";
import { FormulaVersionsTable } from "./formula-versions-table";
import { ui } from "@/shared/ui/styles";

export function FormulaVersionsPage({ versions }: { versions: FormulaVersion[] }) {
  return <div className={ui("pageLayout", "formulaVersionsPage")}>
    <header className={ui("productEditorHeader")}>
      <div><h1>Формулы</h1><div className={ui("meta")}>Фиксированные формулы. Коэффициенты можно менять в отдельном расчёте</div></div>
      <div className={ui("actions")}><span className={ui("badge")}>{versions.length} формул</span></div>
    </header>
    <div className={ui("workspaceGridSingle")}>
      <section className={ui("card", "formulaTableCard")}>
        <div className={ui("cardHead")}><div><h2>Действующие формулы</h2><div className={ui("meta")}>По одной актуальной версии каждой формулы</div></div></div>
        <div className={ui("cardBody", "formulaTableBody")}>
          <FormulaVersionsTable versions={versions} />
        </div>
      </section>
    </div>
  </div>;
}
