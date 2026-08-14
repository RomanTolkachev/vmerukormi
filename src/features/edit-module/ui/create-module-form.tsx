"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createModule } from "../api/update-module";
import { FormulaInput } from "./formula-input";
import { ui } from "@/shared/ui/styles/ui";

export function CreateModuleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"CAT" | "DOG">("DOG");
  const [formula, setFormula] = useState("100 * IW ^ 0.75");
  const [description, setDescription] = useState("");
  const [formulaValid, setFormulaValid] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!formulaValid) {
      setError("Исправьте формулу и дождитесь успешной проверки");
      return;
    }
    setPending(true);
    setError("");
    try {
      const calculationMethod = await createModule({ name, species, formula, description: description || null });
      router.push(`/modules/${calculationMethod.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать методику");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className={ui("formulaCreateForm")}>
    <div className={ui("formGrid", "single")}>
      <label className={ui("field")}><span>Название методики</span><input className={ui("input")} value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className={ui("field")}><span>Вид животного</span><select className={ui("input")} value={species} onChange={(event) => setSpecies(event.target.value as "CAT" | "DOG")}><option value="CAT">Кошка</option><option value="DOG">Собака</option></select></label>
      <FormulaInput value={formula} onChange={setFormula} onValidityChange={setFormulaValid} />
      <label className={ui("field")}><span>Описание</span><textarea className={ui("input")} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <button className={ui("primary")} disabled={pending || !formulaValid}>{pending ? "Создаём…" : "Создать методику"}</button>
      {error && <div className={ui("error")}>{error}</div>}
    </div>
  </form>;
}
