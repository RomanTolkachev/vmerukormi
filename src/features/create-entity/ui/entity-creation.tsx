"use client";

import { Fragment, useState, useRef, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { FormDialog } from "@/shared/ui/form-dialog";
import { CreationContext, EntitySelect, useEntityCreation } from "@/shared/ui/entity-select";
import { ui } from "@/shared/ui/styles";
import { RequiredMark } from "@/shared/ui/required-mark";
import { calculateBcs } from "@/entities/pet";
import { creationLabels, type CreationRequest } from "../model/creation";
import { Button, Input, Select } from "@/shared/ui/controls";

export function EntityCreationProvider({ children, isAdmin, renderRationDialog, renderProductDialog, renderCalculationDialog }: { children: ReactNode; isAdmin: boolean; renderRationDialog: (request: CreationRequest, onClose: () => void) => ReactNode; renderCalculationDialog: (request: CreationRequest, onClose: () => void) => ReactNode; renderProductDialog: (request: CreationRequest, onClose: () => void) => ReactNode }) {
  const [dialogs, setDialogs] = useState<(CreationRequest & { id: number })[]>([]);
  const nextId = useRef(0);
  const open = (request: CreationRequest) => setDialogs(current => [...current, { ...request, id: ++nextId.current }]);
  return <CreationContext.Provider value={{ open, isAdmin, labels: { ...creationLabels, ...(!isAdmin ? { nutrients: undefined } : {}) } }}>
    {children}
    {dialogs.map(dialog => {
      const close = () => setDialogs(current => current.filter(entry => entry.id !== dialog.id));
      return dialog.entity === "calculations" ? <Fragment key={dialog.id}>{renderCalculationDialog(dialog, close)}</Fragment> : dialog.entity === "rations" ? <Fragment key={dialog.id}>{renderRationDialog(dialog, close)}</Fragment> : dialog.entity === "products" ? <Fragment key={dialog.id}>{renderProductDialog(dialog, close)}</Fragment> : <EntityCreationDialog key={dialog.id} request={dialog} onClose={close} />;
    })}
  </CreationContext.Provider>;
}

function EntityCreationDialog({ request, onClose }: { request: CreationRequest; onClose: () => void }) {
  return <EntityCreationForm request={request} onClose={onClose} />;
}

function defaults(request: CreationRequest): Record<string, unknown> {
  return { name: "", note: "", species: "CAT", sex: "", customerId: "", breedId: "", actualWeight: 5, idealWeight: 5, code: "", category: "", unit: "мг", title: "", body: "", email: "", phone: "", isShared: request.shared ?? false, ...request.initial };
}

function EntityCreationForm({ request, onClose }: { request: CreationRequest; onClose: () => void }) {
  const { isAdmin } = useEntityCreation();
  const client = useQueryClient();
  const [initial] = useState(() => defaults(request));
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const set = (name: string, value: unknown) => { setValues(current => ({ ...current, [name]: value })); };
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
      if (entity === "species") endpoint = "/api/species";
      if (entity === "tags") { endpoint = "/api/product-tags"; payload = { name: values.name, isShared: shared }; }
      const result = await requestJson<Record<string, unknown> & { id: string }>(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      void client.invalidateQueries({ predicate: query => ["entity-options", "entity-option", `workspace-${entity}`, "local-registry"].includes(String(query.queryKey[0])) });
      onClose();
      request.onCreated?.({ value: result.id, label: String(result.name ?? result.title ?? values.name), data: result });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось создать запись"); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <FormDialog title={creationLabels[entity]} onClose={onClose} busy={busy} dirty={JSON.stringify(values) !== JSON.stringify(initial)}>
    <form onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className={ui("formGrid", ["groups", "tags", "nutrients", "notifications", "measures"].includes(entity) ? "single" : "creationGrid")}>
          {!["notifications", "calculations"].includes(entity) && field("name", entity === "customers" ? "Имя клиента" : "Название", "text", true)}
          {entity === "customers" && <>{field("email", "Email", "email")}{field("phone", "Телефон")}{field("note", "Заметка")}</>}
          {entity === "pets" && <>
            <EntitySelect entity="customers" label="Клиент" value={text("customerId")} onChange={value => set("customerId", value)} />
            <EntitySelect entity="species" label="Вид животного" value={text("species")} required onChange={value => { set("species", value); set("breedId", ""); }} />
            {select("sex", "Пол", [["", "Не выбран"], ["MALE", "Самец"], ["FEMALE", "Самка"]])}
            <EntitySelect entity="breeds" label="Порода" value={text("breedId")} filters={{ species: text("species") }} onChange={(value, option) => { set("breedId", value); const weight = option?.data[values.sex === "MALE" ? "maleIdealWeight" : "femaleIdealWeight"]; if (values.sex && typeof weight === "number") set("idealWeight", weight); }} />
            {field("actualWeight", "Фактическая масса, кг", "number", true)}{field("idealWeight", "Идеальная масса, кг", "number", true)}
            <p>BCS: {calculateBcs(Number(values.actualWeight), Number(values.idealWeight))} — рассчитан автоматически</p>
          </>}
          {entity === "nutrients" && <>{field("code", "Код", "text", true)}{field("category", "Категория", "text", true)}{field("unit", "Единица", "text", true)}</>}
          {entity === "species" && field("code", "Код вида (латиницей)", "text", true)}
          {entity === "notifications" && <>{field("title", "Заголовок", "text", true)}{field("body", "Текст", "text", true)}</>}
          {isAdmin && !request.shared && ["products", "groups", "tags"].includes(entity) && <label><Input type="checkbox" checked={shared} onChange={event => { set("isShared", event.target.checked); set("groupId", ""); }} /> Общий каталог для всех пользователей</label>}
          {error && <p role="alert" className={ui("error")}>{error}</p>}
          <Button type="submit" className={ui("primary")} disabled={busy}>{busy ? "Сохраняем…" : "Создать"}</Button>
        </div>
      </fieldset>
    </form>
  </FormDialog>;
}
