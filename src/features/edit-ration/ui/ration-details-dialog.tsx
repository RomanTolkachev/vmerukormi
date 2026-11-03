"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RationDetails, RationMode } from "@/entities/ration";
import { EntitySelect } from "@/shared/ui/entity-select";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Button, Input, Select, Textarea } from "@/shared/ui/controls";
import { ui } from "@/shared/ui/styles";
import { RequiredMark } from "@/shared/ui/required-mark";
import { saveRation } from "../api/save-ration";
import { changeRationCustomer, changeRationPet, rationFormDefaults, type RationFormValues } from "../model/ration-form";

export function RationDetailsDialog({ ration, initial, onSaved, onClose }: {
  ration?: RationDetails;
  initial?: Record<string, unknown>;
  onSaved: (ration: RationDetails) => void;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [original] = useState(() => rationFormDefaults(ration ?? initial));
  const [values, setValues] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(original);
  const set = <Field extends keyof RationFormValues>(field: Field, value: RationFormValues[Field]) => {
    setValues(current => ({ ...current, [field]: value }));
    setError("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await saveRation(values, ration?.id);
      void client.invalidateQueries({ predicate: query => ["rations-list", "workspace-rations", "entity-options", "entity-option"].includes(String(query.queryKey[0])) });
      onSaved(saved);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить рацион");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <FormDialog title={ration ? "Параметры рациона" : "Создать рацион"} onClose={onClose} dirty={dirty} busy={busy}
    discardTitle={ration ? "Отменить изменения?" : undefined} discardLabel={ration ? "Отменить изменения" : undefined}>
    <form onSubmit={submit}>
      <div className={ui("formGrid")}>
        <label className={ui("field", "full")}><span>Название</span><Input value={values.name} maxLength={160} required disabled={busy} onChange={event => set("name", event.target.value)} /></label>
        <EntitySelect entity="customers" label="Хозяин" value={values.customerId} disabled={busy} onChange={value => { setValues(current => changeRationCustomer(current, value)); setError(""); }} />
        <EntitySelect entity="pets" label="Питомец" value={values.petId} filters={values.customerId ? { customerId: values.customerId } : undefined} initial={{ customerId: values.customerId }} disabled={busy}
          selectedOption={ration?.pet?.id === values.petId ? { value: ration.pet.id, label: ration.pet.name, data: { customerId: ration.customerId } } : null}
          onChange={(value, option) => { setValues(current => changeRationPet(current, value, option ? String(option.data.customerId ?? "") : current.customerId)); setError(""); }} />
        <div className={ui("field", "full")}><EntitySelect entity="calculations" label="Расчёт нормы" value={values.calculationId} filters={{ petId: values.petId }} initial={{ petId: values.petId }} disabled={busy || !values.petId}
          selectedOption={ration?.calculation?.id === values.calculationId ? { value: ration.calculation.id, label: `${ration.calculation.moduleName} · ${new Date(ration.calculation.createdAt).toLocaleDateString("ru-RU")}`, data: ration.calculation } : null}
          onChange={(value, option) => { setValues(current => ({ ...current, calculationId: value, targetEnergy: String(option?.data.adjustedEnergy ?? "") })); setError(""); }} /></div>
        <label className={ui("field")}><span>Режим<RequiredMark /></span><Select required value={values.mode} disabled={busy} onChange={event => set("mode", event.target.value as RationMode)}><option value="DAILY">На день</option><option value="WEEKLY">На неделю</option></Select></label>
        <label className={ui("field")}><span>Целевая энергия, ккал/сут</span><Input type="number" min="0" max="100000" step="any" value={values.targetEnergy} disabled={busy} onChange={event => set("targetEnergy", event.target.value)} placeholder="Из расчёта питомца" /></label>
        <label className={ui("field", "full")}><span>Допустимое превышение, %</span><Input type="number" min="0" max="100" step="any" value={values.tolerancePercent} required disabled={busy} onChange={event => set("tolerancePercent", event.target.value)} /><small className={ui("fieldHint")}>По умолчанию 10%. Недобор и превышение диапазона подсвечиваются красным.</small></label>
        <label className={ui("field", "full")}><span>Заметка</span><Textarea rows={3} maxLength={4000} value={values.note} disabled={busy} onChange={event => set("note", event.target.value)} /></label>
      </div>
      {ration?.mode === "WEEKLY" && values.mode === "DAILY" && <p className={ui("fieldHint")}>Все позиции будут перенесены на первый день. Продукты и их количества сохранятся.</p>}
      {error && <p className={ui("error")} role="alert">{error}</p>}
      <div className={ui("actions")}><Button type="submit" variant="primary" disabled={busy || Boolean(ration && !dirty)}>{busy ? "Сохраняем…" : ration ? "Сохранить параметры" : "Создать рацион"}</Button></div>
    </form>
  </FormDialog>;
}
