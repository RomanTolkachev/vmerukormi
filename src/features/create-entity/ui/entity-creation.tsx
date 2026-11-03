"use client";

import { Fragment, useState, useRef, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntityChoice } from "@/shared/api/entity-choice";
import { requestJson } from "@/shared/api";
import { FormDialog } from "@/shared/ui/form-dialog";
import { CreationContext, EntitySelect, useEntityCreation } from "@/shared/ui/entity-select";
import { ui } from "@/shared/ui/styles";
import { RequiredMark } from "@/shared/ui/required-mark";
import type { EnergyResult } from "@/entities/calculation";
import { calculateBcs } from "@/entities/pet";
import { creationLabels, type CreationRequest } from "../model/creation";
import { Button, Input, Select } from "@/shared/ui/controls";

export function EntityCreationProvider({ children, isAdmin, renderRationDialog }: { children: ReactNode; isAdmin: boolean; renderRationDialog: (request: CreationRequest, onClose: () => void) => ReactNode }) {
  const [dialogs, setDialogs] = useState<(CreationRequest & { id: number })[]>([]);
  const nextId = useRef(0);
  const open = (request: CreationRequest) => setDialogs(current => [...current, { ...request, id: ++nextId.current }]);
  return <CreationContext.Provider value={{ open, isAdmin, labels: creationLabels }}>
    {children}
    {dialogs.map(dialog => {
      const close = () => setDialogs(current => current.filter(entry => entry.id !== dialog.id));
      return dialog.entity === "rations" ? <Fragment key={dialog.id}>{renderRationDialog(dialog, close)}</Fragment> : <EntityCreationDialog key={dialog.id} request={dialog} onClose={close} />;
    })}
  </CreationContext.Provider>;
}

function EntityCreationDialog({ request, onClose }: { request: CreationRequest; onClose: () => void }) {
  const petId = request.entity === "calculations" ? String(request.initial?.petId ?? "") : "";
  const pet = useQuery({ queryKey: ["entity-option", "pets", petId], enabled: Boolean(petId), queryFn: ({ signal }) => requestJson<EntityChoice[]>(`/api/options/pets?${new URLSearchParams({ id: petId })}`, { signal }) });
  if (petId && !pet.data?.[0]) return <FormDialog title={creationLabels[request.entity]} onClose={onClose}>
    {pet.isPending ? <p>Загружаем данные питомца…</p> : <><p role="alert">Не удалось загрузить питомца.</p><Button type="button" onClick={() => void pet.refetch()}>Повторить</Button></>}
  </FormDialog>;
  const details = pet.data?.[0]?.data;
  const initial = details ? { ...request.initial, species: details.species, actualWeight: details.actualWeight, idealWeight: details.idealWeight } : request.initial;
  return <EntityCreationForm request={{ ...request, initial }} onClose={onClose} />;
}

function defaults(request: CreationRequest): Record<string, unknown> {
  return { name: "", note: "", species: "CAT", sex: "", customerId: "", breedId: "", actualWeight: 5, idealWeight: 5, kind: "PRODUCT", calories: 0, protein: 0, fat: 0, carbs: 0, groupId: "", code: "", category: "", unit: "мг", petId: "", moduleId: "", formula: "100 * IW ^ 0.75", description: "", energyFactor: 1, lactationWeek: 1, childrenCount: 0, title: "", body: "", email: "", phone: "", isShared: request.shared ?? false, ...request.initial };
}

function EntityCreationForm({ request, onClose }: { request: CreationRequest; onClose: () => void }) {
  const { isAdmin } = useEntityCreation();
  const client = useQueryClient();
  const [initial] = useState(() => defaults(request));
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<EnergyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const set = (name: string, value: unknown) => { setPreview(null); setValues(current => ({ ...current, [name]: value })); };
  const entity = request.entity;
  const shared = Boolean(values.isShared);
  const text = (name: string) => String(values[name] ?? "");
  const field = (name: string, label: string, type = "text", required = false) => <label className={ui("field")} key={name}><span>{label}</span><Input className={ui("input")} type={type} value={text(name)} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} onChange={event => set(name, event.target.value)} /></label>;
  const select = (name: string, label: string, options: [string, string][], required = false) => <label className={ui("field")}><span>{label}{required && <RequiredMark />}</span><Select className={ui("input")} required={required} value={text(name)} onChange={event => { set(name, event.target.value); if (name === "species") set("breedId", ""); }}>{options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</Select></label>;
  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      let endpoint = `/api/workspace/${entity}`;
      let payload: Record<string, unknown> = values;
      if (entity === "pets") {
        endpoint = "/api/pets";
        payload = { ...values, sex: values.sex || null, breedId: values.breedId || null, customerId: values.customerId || null, bcs: calculateBcs(Number(values.actualWeight), Number(values.idealWeight)) };
      }
      if (entity === "modules") { endpoint = "/api/modules"; payload = { name: values.name, species: values.species, formula: values.formula, description: values.description || null }; }
      if (entity === "calculations") {
        endpoint = "/api/calculations";
        payload = { petId: values.petId || null, moduleId: values.moduleId, actualWeight: values.actualWeight, idealWeight: values.idealWeight, bcs: calculateBcs(Number(values.actualWeight), Number(values.idealWeight)), energyFactor: values.energyFactor, lactationWeek: values.lactationWeek, childrenCount: values.childrenCount, save: Boolean(preview) };
        if (!preview) { setPreview(await requestJson<EnergyResult>(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })); return; }
        payload = { ...payload, adjustedEnergy: preview.adjustedEnergy, protein: preview.protein, fat: preview.fat, carbs: preview.carbs, nutrients: preview.standardNutrients.filter(nutrient => nutrient.targetAmount !== null).map(nutrient => ({ nutrientId: nutrient.nutrientId, targetAmount: nutrient.targetAmount })) };
      }
      if (entity === "tags") { endpoint = "/api/product-tags"; payload = { name: values.name, isShared: shared }; }
      const result = await requestJson<Record<string, unknown> & { id: string }>(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      void client.invalidateQueries({ predicate: query => ["entity-options", "entity-option", `workspace-${entity}`, "local-registry"].includes(String(query.queryKey[0])) });
      onClose();
      request.onCreated?.({ value: result.id, label: String(result.name ?? result.title ?? (entity === "calculations" ? "Новый расчёт" : values.name)), data: entity === "calculations" ? { ...result, moduleName: (result.module as { name?: string } | undefined)?.name ?? "", petName: (result.pet as { name?: string } | undefined)?.name ?? null } : result });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось создать запись"); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <FormDialog title={creationLabels[entity]} onClose={onClose} busy={busy} dirty={Boolean(preview) || JSON.stringify(values) !== JSON.stringify(initial)}>
    <form onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className={ui("formGrid", ["groups", "tags", "nutrients", "notifications", "measures"].includes(entity) ? "single" : "creationGrid")}>
          {!["notifications", "calculations"].includes(entity) && field("name", entity === "customers" ? "Имя клиента" : "Название", "text", true)}
          {entity === "customers" && <>{field("email", "Email", "email")}{field("phone", "Телефон")}{field("note", "Заметка")}</>}
          {entity === "pets" && <>
            <EntitySelect entity="customers" label="Клиент" value={text("customerId")} onChange={value => set("customerId", value)} />
            {select("species", "Вид", [["CAT", "Кошка"], ["DOG", "Собака"]], true)}
            {select("sex", "Пол", [["", "Не выбран"], ["MALE", "Самец"], ["FEMALE", "Самка"]])}
            <EntitySelect entity="breeds" label="Порода" value={text("breedId")} filters={{ species: text("species") }} onChange={(value, option) => { set("breedId", value); const weight = option?.data[values.sex === "MALE" ? "maleIdealWeight" : "femaleIdealWeight"]; if (values.sex && typeof weight === "number") set("idealWeight", weight); }} />
            {field("actualWeight", "Фактическая масса, кг", "number", true)}{field("idealWeight", "Идеальная масса, кг", "number", true)}
            <p>BCS: {calculateBcs(Number(values.actualWeight), Number(values.idealWeight))} — рассчитан автоматически</p>
          </>}
          {entity === "products" && <>
            {select("kind", "Тип", [["PRODUCT", "Продукт"], ["SUPPLEMENT", "Добавка"], ["RECIPE", "Рецепт"]], true)}
            <EntitySelect entity="groups" label="Группа" value={text("groupId")} filters={{ shared: String(shared) }} onChange={value => set("groupId", value)} />
            {field("calories", "ккал / 100 г", "number")}{field("protein", "Белок, г", "number")}{field("fat", "Жир, г", "number")}{field("carbs", "Углеводы, г", "number")}
            <small>Нутриентный состав можно заполнить после создания в карточке продукта.</small>
          </>}
          {entity === "nutrients" && <>{field("code", "Код", "text", true)}{field("category", "Категория", "text", true)}{field("unit", "Единица", "text", true)}</>}
          {entity === "modules" && <>{select("species", "Вид животного", [["CAT", "Кошка"], ["DOG", "Собака"]], true)}{field("formula", "Формула", "text", true)}{field("description", "Описание")}<p>Переменные: AW, IW, BCS, WEEK, CHILDREN, K, L, N, M. Формула проверяется перед сохранением.</p></>}
          {entity === "calculations" && <>
            <EntitySelect entity="pets" label="Питомец" value={text("petId")} onChange={(value, option) => { setPreview(null); setValues(current => ({ ...current, petId: value, species: option?.data.species ?? "CAT", actualWeight: option?.data.actualWeight ?? 5, idealWeight: option?.data.idealWeight ?? 5, moduleId: "" })); }} />
            <EntitySelect entity="modules" label="Методика" value={text("moduleId")} required filters={{ species: text("species") }} onChange={value => set("moduleId", value)} />
            {field("actualWeight", "Фактическая масса, кг", "number", true)}{field("idealWeight", "Идеальная масса, кг", "number", true)}
            {field("energyFactor", "Доля нормы энергии", "number", true)}{field("lactationWeek", "Неделя лактации", "number", true)}{field("childrenCount", "Количество детёнышей", "number", true)}
            {preview && <section><h3>Результат расчёта</h3>{(["adjustedEnergy", "protein", "fat", "carbs"] as const).map((key, index) => <label className={ui("field")} key={key}><span>{["Энергия, ккал", "Белок, г", "Жир, г", "Углеводы, г"][index]}</span><Input className={ui("input")} type="number" min={key === "adjustedEnergy" ? 1 : 0} step="any" value={preview[key]} onChange={event => setPreview({ ...preview, [key]: Number(event.target.value) })} /></label>)}{preview.standardNutrients.map(nutrient => <label className={ui("field")} key={nutrient.nutrientId}><span>{nutrient.name}, {nutrient.unit}</span><Input className={ui("input")} type="number" min="0" step="any" value={nutrient.targetAmount ?? ""} onChange={event => setPreview({ ...preview, standardNutrients: preview.standardNutrients.map(item => item.nutrientId === nutrient.nutrientId ? { ...item, targetAmount: event.target.value === "" ? null : Number(event.target.value) } : item) })} /></label>)}</section>}
          </>}
          {entity === "notifications" && <>{field("title", "Заголовок", "text", true)}{field("body", "Текст", "text", true)}</>}
          {isAdmin && !request.shared && ["products", "groups", "tags", "nutrients"].includes(entity) && <label><Input type="checkbox" checked={shared} onChange={event => { set("isShared", event.target.checked); set("groupId", ""); }} /> Общий каталог для всех пользователей</label>}
          {error && <p role="alert" className={ui("error")}>{error}</p>}
          <Button type="submit" className={ui("primary")} disabled={busy}>{busy ? "Сохраняем…" : entity === "calculations" ? (preview ? "Сохранить расчёт" : "Рассчитать") : "Создать"}</Button>
        </div>
      </fieldset>
    </form>
  </FormDialog>;
}
