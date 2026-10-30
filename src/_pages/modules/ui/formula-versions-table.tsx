"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormulaVersion } from "@/entities/module";
import { ui } from "@/shared/ui/styles";

export function FormulaVersionsTable({ versions }: { versions: FormulaVersion[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return versions;
    return versions.filter((version) => [
      version.moduleName,
      version.species === "CAT" ? "кошка" : "собака",
      version.formula,
    ].some((value) => value.toLocaleLowerCase("ru").includes(query)));
  }, [search, versions]);

  return <>
    <div className={ui("formulaTableTools")}>
      <input className={ui("input", "formulaSearch")} type="search" aria-label="Поиск формул" placeholder="Название или формула" value={search} onChange={(event) => setSearch(event.target.value)} />
      <span>{filtered.length} из {versions.length}</span>
    </div>
    {filtered.length ? <div className={ui("detailTableWrap")}>
      <table className={ui("detailTable", "formulaTable")}>
        <thead><tr><th>Методика</th><th>Вид</th><th>Формула</th><th /></tr></thead>
        <tbody>{filtered.map((version) => <tr key={version.id}>
          <td><b>{version.moduleName}</b></td>
          <td>{version.species === "CAT" ? "Кошка" : "Собака"}</td>
          <td><code>{version.formula}</code></td>
          <td><Link className={ui("rationProductLink")} href={`/modules/${version.moduleId}`}>Смотреть →</Link></td>
        </tr>)}</tbody>
      </table>
    </div> : <div className={ui("empty", "formulaSearchEmpty")}>По вашему запросу формулы не найдены</div>}
  </>;
}
