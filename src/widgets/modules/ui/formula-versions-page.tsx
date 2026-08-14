import type { FormulaVersion } from "@/entities/module/model/types";
import { CreateModuleForm } from "@/features/edit-module/ui/create-module-form";
import { FormulaVersionsTable } from "./formula-versions-table";
import { ui } from "@/shared/ui/styles/ui";

export function FormulaVersionsPage({ versions, canEdit }: { versions: FormulaVersion[]; canEdit: boolean }) {
  return <div className={ui("pageLayout", "formulaVersionsPage")}>
    <header className={ui("productEditorHeader")}>
      <div><h1>Формулы</h1><div className={ui("meta")}>Версии энергетических методик и периоды их действия</div></div>
      <span className={ui("badge")}>{versions.length} методик</span>
    </header>
    <div className={ui("formulaVersionsGrid")}>
      <section className={ui("card", "formulaTableCard")}>
        <div className={ui("cardHead")}><div><h2>Действующие формулы</h2><div className={ui("meta")}>По одной актуальной версии каждой методики</div></div></div>
        <div className={ui("cardBody", "formulaTableBody")}>
          <FormulaVersionsTable versions={versions} />
        </div>
      </section>
      {canEdit ? <aside className={ui("card", "formulaCreateCard")}>
        <div className={ui("cardHead")}><div><h2>Новая методика</h2><div className={ui("meta")}>Первая версия начнёт действовать сразу</div></div></div>
        <div className={ui("cardBody")}><CreateModuleForm /><div className={ui("notice")}>Переменные: AW, IW, BCS, WEEK, CHILDREN, K, L, N, M. Функции: exp, min, max.</div></div>
      </aside> : null}
    </div>
  </div>;
}
