"use client";
import Link from "next/link";
import type { FormulaVersion } from "@/entities/module";
import { LocalRegistry } from "@/shared/ui/local-registry";
import { ui } from "@/shared/ui/styles";
export function FormulaVersionsTable({ versions }: { versions: FormulaVersion[] }) {
  return <LocalRegistry tableName="formula-methods" rows={versions.map(version => ({ ...version, speciesLabel: version.speciesCodes.map(code => code === "CAT" ? "Кошка" : code === "DOG" ? "Собака" : code).join(", ") }))}
    columns={[{ name: "moduleName", label: "Название" }, { name: "speciesLabel", label: "Вид" }, { name: "formula", label: "Формула" }]}
    columnSizeData={{ moduleName: 280, speciesLabel: 120, formula: 560 }} actionCellWidth={140}
    actionCell={(_, version) => <Link className={ui("tablePrimaryLink")} href={`/modules/${version.moduleId}`}>Смотреть →</Link>} />;
}
