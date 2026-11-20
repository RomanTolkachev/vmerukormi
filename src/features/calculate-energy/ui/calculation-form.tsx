"use client";
import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calculationParameters, cleanParameters, requiredParameters, getFormulaTemplate, parameterLabel, displayFormula, resolveParameters, type ParameterDraft, type CoefficientDraft } from "@backend/domain/nutrition/parameters";
import type { Pet } from "@/entities/pet";
import { macroEnergy, type EnergyResult } from "@/entities/calculation";
import { requestJson } from "@/shared/api";
import type { EntityChoice } from "@/shared/api/entity-choice";
import { EntitySelect } from "@/shared/ui/entity-select";
import { Button, Input, Select } from "@/shared/ui/controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { RequiredMark } from "@/shared/ui/required-mark";
import { notify } from "@/shared/ui/notifications";
import { ui } from "@/shared/ui/styles";
import styles from "./calculation-form.module.css";

type Formula = { id: string; name: string; speciesCodes: string[]; versions: { id: string; formula: string; templateKey: string | null }[] };
type Result = EnergyResult & { variables: Record<string, number>; coefficients: Record<string, number>; formulaVersionId: string; formulaExpression: string };
type Saved = Record<string, unknown> & { id: string; name: string };
type Props = { initialPetId?: string; customerId?: string; compact?: boolean; onSaved?: (record: Saved) => void; onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void };

export function CalculationEntry(props: Props) {
  const pet = useQuery({ queryKey: ["entity-option", "pets", props.initialPetId], enabled: Boolean(props.initialPetId), queryFn: ({ signal }) => requestJson<EntityChoice[]>(`/api/options/pets?id=${encodeURIComponent(props.initialPetId!)}`, { signal }) });
  if (props.initialPetId && !pet.data?.[0]) return <div>{pet.isPending ? <p role="status">Загружаем питомца…</p> : <><p role="alert">Питомец недоступен.</p><Button onClick={() => void pet.refetch()}>Повторить</Button></>}</div>;
  return <CalculationForm key={props.initialPetId ?? "new"} {...props} initialPet={pet.data?.[0]?.data as unknown as Pet | undefined} />;
}
export function CalculationDialog({ initial = {}, onClose, onSaved }: { initial?: Record<string, unknown>; onClose: () => void; onSaved: (record: Saved) => void }) {
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  return <FormDialog title="Создать расчёт" onClose={onClose} dirty={dirty} busy={busy}><CalculationEntry initialPetId={String(initial.petId ?? "") || undefined} customerId={String(initial.customerId ?? "") || undefined} compact onDirtyChange={setDirty} onBusyChange={setBusy} onSaved={record => { onSaved(record); onClose(); }} /></FormDialog>;
}
function CalculationForm({ initialPet, customerId, compact, onSaved, onDirtyChange, onBusyChange }: Props & { initialPet?: Pet }) {
  const [name, setName] = useState("");
  const [petId, setPetId] = useState(initialPet?.id ?? "");
  const [species, setSpecies] = useState<string>(initialPet?.species ?? "CAT");
  const [breedId, setBreedId] = useState(initialPet?.breedId ?? "");
  const [sex, setSex] = useState(initialPet?.sex ?? "");
  const [formula, setFormula] = useState<Formula | null>(null);
  const [parameters, setParameters] = useState<ParameterDraft>(initialPet ? { AW: initialPet.actualWeight, IW: initialPet.idealWeight } : {});
  const [coefficients, setCoefficients] = useState<CoefficientDraft>({});
  const [factor, setFactor] = useState("1");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const queryClient = useQueryClient();
  const version = formula?.versions[0];
  const template = getFormulaTemplate(version?.templateKey);
  const required = template ? requiredParameters(template, parameters) : new Set<string>();
  const activeParameters = Object.fromEntries(Object.entries(parameters).filter(([key]) => template?.fields.some(field => field === key)));
  const automatic = (() => {
    if (!template) return {};
    try {
      const input = Object.fromEntries(Object.entries(activeParameters).filter(([key]) => !template.automatic.some(field => field === key)));
      return resolveParameters(template, cleanParameters(input, template));
    } catch { return {}; }
  })();
  const coefficientsChanged = template?.coefficients.some(item => coefficients[item.key] !== undefined && Number(coefficients[item.key]) !== item.value)
    || template?.automatic.some(key => parameters[key] !== undefined && parameters[key] !== "") || Number(factor) !== 1;
  function changed() { setResult(null); setError(""); onDirtyChange?.(true); }
  function choosePet(value: string, option: EntityChoice | null) {
    setPetId(value); changed();
    if (!option) return;
    const pet = option.data as unknown as Pet;
    setSpecies(pet.species); setBreedId(pet.breedId ?? ""); setSex(pet.sex ?? "");
    setParameters({ AW: pet.actualWeight, IW: pet.idealWeight }); setCoefficients({}); setFactor("1");
    if (!formula?.speciesCodes.includes(pet.species)) setFormula(null);
  }
  function chooseFormula(value: string, option: EntityChoice | null) {
    changed();
    const next = value && option ? option.data as unknown as Formula : null;
    if (next && (!next.speciesCodes.includes(species) || !getFormulaTemplate(next.versions[0]?.templateKey))) { setFormula(null); setError("Выберите действующую формулу для выбранного вида"); return; }
    setFormula(next); setCoefficients({}); setFactor("1");
    setParameters(current => ({ ...(current.AW === undefined ? {} : { AW: current.AW }), ...(current.IW === undefined ? {} : { IW: current.IW }) }));
  }
  function resetCoefficients() {
    changed(); setCoefficients({}); setFactor("1");
    setParameters(current => Object.fromEntries(Object.entries(current).filter(([key]) => !template?.automatic.some(field => field === key))));
  }
  async function run(save: boolean) {
    if (submitting.current) return;
    setError("");
    if (!version || !formula || !template) { setError("Выберите формулу"); return; }
    if (save && (!result || !name.trim())) { setError(result ? "Введите название расчёта" : "Сначала выполните расчёт"); return; }
    submitting.current = true; setBusy(true); onBusyChange?.(true);
    try {
      const payload = { name, moduleId: formula.id, expectedVersionId: version.id, species, petId: petId || null, breedId: breedId || null, sex: sex || null, parameters: cleanParameters(activeParameters, template), coefficients, energyFactor: factor.trim() ? Number(factor) : 1, save,
        ...(save && result ? { adjustedEnergy: result.adjustedEnergy, protein: result.protein, fat: result.fat, carbs: result.carbs, nutrients: result.standardNutrients.filter(item => item.targetAmount !== null).map(item => ({ nutrientId: item.nutrientId, targetAmount: item.targetAmount })) } : {}) };
      const response = await requestJson<Result & Saved>("/api/calculations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (save) {
        void queryClient.invalidateQueries({ predicate: query => ["calculations", "entity-options", "entity-option"].includes(String(query.queryKey[0])) });
        notify.success("Расчёт сохранён"); onDirtyChange?.(false); setResult(null); onSaved?.(response);
      } else setResult(response);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт"); }
    finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); event.stopPropagation(); void run(false); }
  return <div className={`${styles.layout} ${compact ? styles.compact : ""}`}>
    <form onSubmit={submit} className={styles.panel}>
      <h2>Параметры расчёта</h2>
      <fieldset disabled={busy} className={styles.fields}>
        <label className={ui("field")}><span>Название расчёта<RequiredMark /></span><Input maxLength={160} value={name} onChange={event => { setName(event.target.value); setError(""); onDirtyChange?.(true); }} placeholder="Название для сохранения" /></label>
        <EntitySelect entity="pets" label="Питомец" value={petId} filters={customerId ? { customerId } : {}} disabled={busy} onChange={choosePet} />
        <EntitySelect entity="species" label="Вид животного" allowCreate={false} required value={species} disabled={busy || Boolean(petId)} onChange={value => { setSpecies(value); setBreedId(""); setFormula(null); setParameters({}); setCoefficients({}); setFactor("1"); changed(); }} />
        <EntitySelect entity="modules" label="Формула" allowCreate={false} value={formula?.id ?? ""} required filters={{ species }} disabled={busy || !species} onChange={chooseFormula} />
        <div className={ui("formGrid")}>
          <EntitySelect entity="breeds" label="Порода" allowCreate={false} value={breedId} filters={{ species }} disabled={busy || Boolean(petId)} onChange={(value, option) => { setBreedId(value); changed(); const weight = option?.data[sex === "MALE" ? "maleIdealWeight" : "femaleIdealWeight"]; if (sex && typeof weight === "number") setParameters(current => ({ ...current, IW: weight })); }} />
          <label className={ui("field")}><span>Пол</span><Select value={sex} disabled={Boolean(petId)} onChange={event => { setSex(event.target.value as typeof sex); changed(); }}><option value="">Не выбран</option><option value="MALE">Самец</option><option value="FEMALE">Самка</option></Select></label>
        </div>
        {template && <>
          <div className={ui("formGrid")}>{template.fields.filter(key => !template.automatic.includes(key)).map(key => {
            const parameter = calculationParameters.find(item => item.key === key)!;
            return <label className={ui("field")} key={key}><span>{parameterLabel(template, key)}{required.has(key) && <RequiredMark />}</span><Input type="number" step={"integer" in parameter ? 1 : "any"} min={parameter.min} required={required.has(key)} placeholder="Не задано" value={parameters[key] ?? ""} onChange={event => { changed(); setParameters(current => ({ ...current, [key]: event.target.value })); }} /><small className={ui("fieldHint")}>{key === "AW" ? "AW — текущая масса питомца" : key === "IW" ? (template.growing ? "IW — ожидаемая масса во взрослом возрасте" : "IW — идеальная масса питомца") : "Нужен для автоматического коэффициента; ручное значение можно задать ниже"}</small></label>;
          })}</div>
          <section className={styles.coefficients}><h3>Коэффициенты формулы{coefficientsChanged ? " · изменены" : ""}</h3><p className={ui("meta")}>Изменения действуют только в этом расчёте. Структура формулы фиксирована.</p>
            <div className={ui("formGrid")}>{template.coefficients.map(item => <label className={ui("field")} key={item.key}><span>{item.label}</span><Input type="number" step="any" required value={coefficients[item.key] ?? item.value} onChange={event => { changed(); setCoefficients(current => ({ ...current, [item.key]: event.target.value })); }} /><small className={ui("fieldHint")}>{item.key} · стандартное значение: {item.value}{coefficients[item.key] !== undefined && Number(coefficients[item.key]) !== item.value ? " · изменено" : ""}</small></label>)}
            {template.automatic.map(key => <label className={ui("field")} key={key}><span>{parameterLabel(template, key)}</span><Input type="number" step="any" min="0" placeholder={automatic[key] === undefined ? "Автоматически" : `Автоматически: ${automatic[key]}`} value={parameters[key] ?? ""} onChange={event => { changed(); setParameters(current => ({ ...current, [key]: event.target.value })); }} /><small className={ui("fieldHint")}>Пусто — автоматически; 0 — ручной ноль</small></label>)}</div>
            <label className={ui("field")}><span>Индивидуальная потребность, доля ОЭ</span><Input type="number" min={Number.MIN_VALUE} step="any" value={factor} onChange={event => { setFactor(event.target.value); changed(); }} /><small className={ui("fieldHint")}>Пусто или 1 — без поправки. 1,2 — 120% рассчитанной энергии.</small></label>
            <Button type="button" disabled={busy || !coefficientsChanged} onClick={resetCoefficients}>Сбросить коэффициенты</Button>
          </section>
          <div className={ui("formulaBox")}><strong>Формула</strong><code>{displayFormula(template, coefficients)}</code><span>× {factor || "1"} — индивидуальная поправка</span>{result && <code>{Object.entries(result.variables).map(([key, value]) => `${key} = ${value}`).join("; ")}</code>}</div>
        </>}
        {error && <p role="alert" className={ui("error")}>{error}</p>}
        <div className={ui("actions")}><Button type="submit" variant="primary" disabled={busy || !template}>{busy ? "Подождите…" : "Рассчитать"}</Button><Button type="button" disabled={busy || !result} onClick={() => void run(true)}>Сохранить расчёт</Button><Button type="button" disabled={busy || !result} onClick={() => setResult(null)}>Сбросить результат</Button></div>
      </fieldset>
    </form>
    <section className={styles.panel}><h2>Суточная норма</h2>{!result ? <p>Выберите формулу, заполните необходимые параметры и выполните расчёт.</p> : <fieldset disabled={busy} className={styles.fields}>
      <p className={ui("meta")}>{result.standardSource}</p>
      <label className={ui("field")}><span>Калорийность, ккал/сут</span><Input type="number" min="1" max="2147483647" step="1" value={result.adjustedEnergy} onChange={event => { setResult({ ...result, adjustedEnergy: Number(event.target.value) }); onDirtyChange?.(true); }} /></label>
      <div className={ui("formGrid")}>{(["protein", "fat", "carbs"] as const).map((key, index) => <label className={ui("field")} key={key}><span>{["Белок, г", "Жир, г", "Углеводы, г"][index]}</span><Input type="number" min="0" step="any" value={result[key]} onChange={event => { const next = { ...result, [key]: Number(event.target.value) }; setResult({ ...next, adjustedEnergy: macroEnergy(next.protein, next.fat, next.carbs) }); onDirtyChange?.(true); }} /></label>)}</div>
      <p className={ui("fieldHint")}>Изменение БЖУ пересчитывает энергию. Ручное изменение калорийности не меняет БЖУ. Нутриенты корректируются отдельно.</p>
      <h3>Нутриенты</h3>{result.standardNutrients.map(nutrient => <label className={ui("field")} key={nutrient.nutrientId}><span>{nutrient.name}, {nutrient.unit}/сут</span><Input type="number" min="0" step="any" placeholder="Не задано" value={nutrient.targetAmount ?? ""} onChange={event => { setResult({ ...result, standardNutrients: result.standardNutrients.map(item => item.nutrientId === nutrient.nutrientId ? { ...item, targetAmount: event.target.value === "" ? null : Number(event.target.value) } : item) }); onDirtyChange?.(true); }} /></label>)}
    </fieldset>}</section>
  </div>;
}
