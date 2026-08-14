import Link from "next/link";
import type { FormulaModuleDetails } from "@/entities/module/model/types";
import { CreateVersionForm } from "@/features/edit-module/ui/create-version-form";
import { ui } from "@/shared/ui/styles/ui";

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
    <div className={ui("formulaVersionsGrid")}>
      <section className={ui("card", "formulaTableCard")}>
        <div className={ui("cardHead")}><div><h2>Версии методики</h2><div className={ui("meta")}>Старые версии остаются привязаны к выполненным расчётам</div></div></div>
        <div className={ui("cardBody", "formulaTableBody")}><div className={ui("detailTableWrap")}><table className={ui("detailTable", "formulaTable")}>
          <thead><tr><th>Формула</th><th>Описание</th><th>tech_begin</th><th>tech_end</th><th>Статус</th></tr></thead>
          <tbody>{module.versions.map((version) => <tr key={version.id}><td><code>{version.formula}</code></td><td>{version.description || "—"}</td><td>{displayDate(version.techBegin)}</td><td>{displayDate(version.techEnd)}</td><td><span className={ui("versionStatus", version.current && "versionStatusCurrent")}>{version.current ? "Действует" : "История"}</span></td></tr>)}</tbody>
        </table></div></div>
      </section>
      {canEdit && latest ? <aside className={ui("card", "formulaCreateCard")}>
        <div className={ui("cardHead")}><div><h2>Новая версия</h2><div className={ui("meta")}>Исходные значения скопированы из последней версии</div></div></div>
        <div className={ui("cardBody")}><CreateVersionForm key={latest.id} moduleId={module.id} moduleName={module.name} latestFormula={latest.formula} latestDescription={latest.description} /><div className={ui("notice")}>Новая версия начинает действовать сразу и не изменяет уже выполненные расчёты. Неизвестные переменные блокируют публикацию.</div></div>
      </aside> : null}
    </div>
  </div>;
}
