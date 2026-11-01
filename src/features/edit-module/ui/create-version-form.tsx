"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createFormulaVersion } from "../api/update-module";
import { FormulaInput } from "./formula-input";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ui } from "@/shared/ui/styles";

type VersionProps = { moduleId: string; moduleName: string; latestFormula: string; latestDescription: string | null };
export function CreateVersionForm(props: VersionProps) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={ui("primary")} onClick={() => setOpen(true)}>Новая версия</button>{open && <VersionDialog {...props} onClose={() => setOpen(false)} />}</>;
}
function VersionDialog({ moduleId, moduleName, latestFormula, latestDescription, onClose }: VersionProps & { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(moduleName);
  const [formula, setFormula] = useState(latestFormula);
  const [description, setDescription] = useState(latestDescription ?? "");
  const [formulaValid, setFormulaValid] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!formulaValid) {
      setError("Исправьте формулу и дождитесь успешной проверки");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      await createFormulaVersion(moduleId, { name, formula, description: description || null });
      setMessage("Новая версия опубликована");
      onClose();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать версию");
    } finally {
      setPending(false);
    }
  }

  return <FormDialog title="Новая версия формулы" onClose={onClose} busy={pending} dirty={name !== moduleName || formula !== latestFormula || description !== (latestDescription ?? "")}><form onSubmit={submit} className={ui("formulaCreateForm")}>
    <div className={ui("formGrid", "single")}>
      <label className={ui("field")}><span>Название методики</span><input className={ui("input")} value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <FormulaInput value={formula} onChange={setFormula} onValidityChange={setFormulaValid} />
      <label className={ui("field")}><span>Описание изменений</span><textarea className={ui("input")} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <button className={ui("primary")} disabled={pending || !formulaValid}>{pending ? "Публикуем…" : "Опубликовать новую версию"}</button>
      {message && <div className={ui("success")}>{message}</div>}
      {error && <div className={ui("error")}>{error}</div>}
    </div>
  </form></FormDialog>;
}
