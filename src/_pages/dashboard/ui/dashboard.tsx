"use client";

import { ui } from "@/shared/ui/styles";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { getBreeds } from "@/entities/breed";
import type { Breed } from "@/entities/breed";
import { getCalculations } from "@/entities/calculation";
import type { CalculationHistoryItem, EnergyResult } from "@/entities/calculation";
import { macroEnergy } from "@/entities/calculation";
import type { CalculationModule } from "@/entities/module";
import { getPets } from "@/entities/pet";
import { calculateBcs } from "@/entities/pet";
import type { Pet, Sex } from "@/entities/pet";
import { calculateEnergy } from "@/features/calculate-energy";
import { EntitySelect, useEntityCreation } from "@/features/create-entity";
import { LocalRegistry } from "@/shared/ui/local-registry";
import { deletePet } from "@/features/delete-pet";
import { updatePetCustomer } from "@/features/update-pet-customer";
import { NumberField } from "@/shared/ui";
import { InfoPage } from "./info-page";

type Form = { petId: string; moduleId: string; breedId: string; sex: Sex | ""; actualWeight: number; idealWeight: number; bcs: number; energyFactor: number; lactationWeek: number; childrenCount: number };
export type DashboardTab = "calc" | "pets" | "history" | "info";

const calculationDefaults: Form = { petId: "", moduleId: "cat-adult", breedId: "", sex: "", actualWeight: 5, idealWeight: 5, bcs: 5, energyFactor: 1, lactationWeek: 1, childrenCount: 0 };

function defaultModuleForSpecies(modules: CalculationModule[], species: Pet["species"]) {
  const adultId = species === "CAT" ? "cat-adult" : "dog-adult";
  return modules.find((item) => item.id === adultId)
    ?? modules.find((item) => item.species === species && item.name.toLocaleLowerCase("ru").includes("взросл"))
    ?? modules.find((item) => item.species === species);
}

export function Dashboard({ initialModules, initialTab = "calc", selectedPetId, selectedCustomerId }: { initialModules: CalculationModule[]; initialTab?: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  const router = useRouter();
  const { open } = useEntityCreation();
  const tab = initialTab;
  const [pets, setPets] = useState<Pet[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [moduleRows, setModuleRows] = useState(initialModules);
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [error, setError] = useState("");
  const calculationForm = useForm<Form>({ defaultValues: calculationDefaults });
  const chosenPetId = useWatch({ control: calculationForm.control, name: "petId" });
  const moduleId = useWatch({ control: calculationForm.control, name: "moduleId" });
  const calcBreedId = useWatch({ control: calculationForm.control, name: "breedId" });
  const calcSex = useWatch({ control: calculationForm.control, name: "sex" });
  const calcActual = useWatch({ control: calculationForm.control, name: "actualWeight" });
  const calcIdeal = useWatch({ control: calculationForm.control, name: "idealWeight" });
  const selectedModule = useMemo(() => moduleRows.find((m) => m.id === moduleId)!, [moduleId, moduleRows]);
  const isLactation = moduleId.includes("lactation");
  const calcBreeds = useMemo(() => breeds.filter((breed) => breed.species === selectedModule.species), [breeds, selectedModule.species]);

  async function loadData() {
    const [petRows, historyRows, breedRows] = await Promise.all([getPets(), getCalculations(), getBreeds()]);
    setPets(petRows);
    setHistory(historyRows);
    setBreeds(breedRows);
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getPets(controller.signal), getCalculations(controller.signal), getBreeds(controller.signal)]).then(([petRows, historyRows, breedRows]) => {
      setPets(petRows);
      setHistory(historyRows);
      setBreeds(breedRows);
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const breed = breeds.find((item) => item.id === calcBreedId);
    if (!breed || !calcSex) return;
    calculationForm.setValue("idealWeight", calcSex === "MALE" ? breed.maleIdealWeight : breed.femaleIdealWeight, { shouldDirty: true });
  }, [breeds, calcBreedId, calcSex, calculationForm]);

  useEffect(() => {
    calculationForm.setValue("bcs", calculateBcs(calcActual, calcIdeal));
  }, [calcActual, calcIdeal, calculationForm]);



  useEffect(() => {
    if (calcBreedId && !calcBreeds.some((breed) => breed.id === calcBreedId)) calculationForm.setValue("breedId", "");
  }, [calcBreedId, calcBreeds, calculationForm]);


  useEffect(() => {
    if (tab !== "calc" || !selectedPetId || calculationForm.getValues("petId") === selectedPetId) return;
    const pet = pets.find((item) => item.id === selectedPetId);
    if (!pet) return;
    const compatible = defaultModuleForSpecies(moduleRows, pet.species);
    calculationForm.reset({ ...calculationDefaults, petId: pet.id, breedId: pet.breedId ?? "", sex: pet.sex ?? "", actualWeight: pet.actualWeight, idealWeight: pet.idealWeight, bcs: pet.bcs, moduleId: compatible?.id ?? calculationDefaults.moduleId });
  }, [calculationForm, moduleRows, pets, selectedPetId, tab]);


  function choosePet(pet: Pet) {
    if (tab !== "calc") {
      router.push(`/?petId=${encodeURIComponent(pet.id)}`);
      return;
    }
    const compatible = defaultModuleForSpecies(moduleRows, pet.species);
    calculationForm.reset({ ...calculationDefaults, petId: pet.id, breedId: pet.breedId ?? "", sex: pet.sex ?? "", actualWeight: pet.actualWeight, idealWeight: pet.idealWeight, bcs: pet.bcs, moduleId: compatible?.id ?? moduleId });
    setResult(null);
  }

  function calculationInput(form: Form) {
    return { moduleId: form.moduleId, actualWeight: form.actualWeight, idealWeight: form.idealWeight, bcs: form.bcs, energyFactor: form.energyFactor, lactationWeek: form.lactationWeek, childrenCount: form.childrenCount, petId: form.petId || null, breedId: form.breedId || null, sex: form.sex || null };
  }

  const calculate = calculationForm.handleSubmit(async (form) => {
    setError("");
    try {
      setResult(await calculateEnergy(calculationInput(form), false));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить расчёт");
    }
  });

  async function saveCalculation() {
    if (!result) return;
    setError("");
    try {
      const form = calculationForm.getValues();
      await calculateEnergy({
        ...calculationInput(form),
        adjustedEnergy: result.adjustedEnergy,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
        nutrients: result.standardNutrients
          .filter((item) => item.targetAmount !== null)
          .map((item) => ({ nutrientId: item.nutrientId, targetAmount: item.targetAmount as number })),
      }, true);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить расчёт");
    }
  }

  function updateMacro(field: "protein" | "fat" | "carbs", value: number) {
    setResult((current) => {
      if (!current) return current;
      const macros = { protein: current.protein, fat: current.fat, carbs: current.carbs, [field]: value };
      return { ...current, ...macros, adjustedEnergy: macroEnergy(macros.protein, macros.fat, macros.carbs) };
    });
  }


  async function removePet(id: string) { if (!window.confirm("Удалить питомца?")) return; try { await deletePet(id); await loadData(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось удалить питомца"); } }
  async function assignCustomer(petId: string, customerId: string) {
    setError("");
    try {
      await updatePetCustomer(petId, customerId || null);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить клиента");
    }
  }

  return <div className={ui("pageLayout", "dashboardPage")}>
      <section className={ui("hero")}><div><h1>Питание без чёрного ящика</h1><p>Рассчитывайте суточную обменную энергию кошек и собак по восстановленным формулам. Все коэффициенты доступны в справочнике.</p></div><span className={ui("badge")}>Защищённая сессия</span></section>

      {tab === "calc" && <div className={ui("grid", "calculationGrid")}>
        <section className={ui("card")}><form onSubmit={calculate}><div className={ui("cardHead")}><h2>Параметры расчёта</h2><span className={ui("meta")}>ОЭ, ккал/сут</span></div><div className={ui("cardBody")}>
          <div className={ui("formGrid")}>
            <div className={ui("field", "full")}><EntitySelect entity="pets" label="Питомец" value={chosenPetId} onChange={(value, option) => { if (option) { const pet = option.data as unknown as Pet; setPets(current => current.some(item => item.id === pet.id) ? current : [...current, pet]); choosePet(pet); } else calculationForm.setValue("petId", value); }} /></div>
            <EntitySelect entity="modules" label="Модуль" value={moduleId} onChange={(value, option) => {
              if (!option) return;
              const version = (option.data.versions as Record<string, unknown>[] | undefined)?.[0];
              const chosen = { ...option.data, ...version, id: value } as CalculationModule;
              setModuleRows(current => [...current.filter(module => module.id !== value), chosen]);
              calculationForm.setValue("moduleId", value, { shouldDirty: true });
              setResult(null);
            }} />
            <EntitySelect entity="breeds" label="Порода" value={calcBreedId} filters={{ species: selectedModule.species }} onChange={value => calculationForm.setValue("breedId", value, { shouldDirty: true })} />
            <div className={ui("field")}><label>Пол</label><select className={ui("input")} {...calculationForm.register("sex")}><option value="">Не выбран</option><option value="MALE">Самец</option><option value="FEMALE">Самка</option></select></div>
            <NumberField label="Фактическая масса, кг" registration={calculationForm.register("actualWeight", { valueAsNumber: true, min: 0.1, max: 150 })}/>
            <NumberField label="Идеальная / взрослая масса, кг" registration={calculationForm.register("idealWeight", { valueAsNumber: true, min: 0.1, max: 150 })} hint={calcBreedId && calcSex ? "Предзаполнено по породе и полу; значение можно изменить" : undefined}/>
            <NumberField label="BCS, 1–9" registration={calculationForm.register("bcs", { valueAsNumber: true })} min={1} max={9} step={1} readOnly hint="Автоматически рассчитан из фактической и идеальной массы"/>
            <NumberField label="Индивидуальная потребность, доля ОЭ" registration={calculationForm.register("energyFactor", { valueAsNumber: true, min: 0.1, max: 5 })} min={0.1} max={5} step={0.05} hint="1,2 = 120% нормы, то есть на 20% больше; 0,8 = на 20% меньше"/>
            {isLactation && <><NumberField label="Неделя лактации" registration={calculationForm.register("lactationWeek", { valueAsNumber: true })} min={1} max={12} step={1}/><NumberField label="Количество детёнышей" registration={calculationForm.register("childrenCount", { valueAsNumber: true })} min={0} max={20} step={1}/></>}
          </div>
          <div className={ui("formulaBox")}><strong>Формула модуля</strong><code>{selectedModule.formula}</code></div>
          <div className={ui("actions")}><button className={ui("primary")} type="submit">Рассчитать стандартные нормы</button><button className={ui("secondary")} type="button" onClick={()=>setResult(null)}>Сбросить результат</button></div>
          {error && <div className={ui("error")}>{error}</div>}
        </div></form></section>
        <aside className={ui("calculationTargetEditor")}>{result ? <><div className={ui("card")}><div className={ui("cardBody")}><div className={ui("resultLabel")}>Суточная норма</div><label className={ui("field")}><span>Калорийность, ккал/сут</span><input className={ui("input", "highlight")} type="number" min="1" value={result.adjustedEnergy} onChange={(event)=>setResult({ ...result, adjustedEnergy: Number(event.target.value) })}/></label><div className={ui("formGrid")}><label className={ui("field")}><span>Белок, г</span><input className={ui("input")} type="number" min="0" step="0.01" value={result.protein} onChange={(event)=>updateMacro("protein", Number(event.target.value))}/></label><label className={ui("field")}><span>Жир, г</span><input className={ui("input")} type="number" min="0" step="0.01" value={result.fat} onChange={(event)=>updateMacro("fat", Number(event.target.value))}/></label><label className={ui("field", "full")}><span>Углеводы, г</span><input className={ui("input")} type="number" min="0" step="0.01" value={result.carbs} onChange={(event)=>updateMacro("carbs", Number(event.target.value))}/></label></div><div className={ui("fieldHint")}>Изменение БЖУ пересчитывает калорийность по модифицированным коэффициентам Atwater. Ручное изменение калорийности не меняет БЖУ.</div><div className={ui("resultSub")}><span>Норма калорий</span><b>{result.baseEnergy} ккал</b></div></div></div><div className={ui("card", "calculationNutrientsCard")}><div className={ui("cardHead")}><div><h2>Нутриенты</h2><div className={ui("meta")}>{result.standardSource}</div></div></div><div className={ui("cardBody", "calculationNutrientsBody")}><div className={ui("nutrientTargetList")}>{result.standardNutrients.map((nutrient)=><label className={ui("nutrientTargetRow")} key={nutrient.nutrientId}><span><b>{nutrient.code}</b>{nutrient.name}</span><input className={ui("input")} type="number" min="0" step="any" placeholder="Не задано" value={nutrient.targetAmount ?? ""} onChange={(event)=>setResult({ ...result, standardNutrients: result.standardNutrients.map((item)=>item.nutrientId===nutrient.nutrientId ? { ...item, targetAmount: event.target.value === "" ? null : Number(event.target.value) } : item) })}/><small>{nutrient.unit}/сут</small></label>)}</div><div className={ui("actions")}><button className={ui("primary")} type="button" onClick={()=>void saveCalculation()}>Сохранить расчёт</button></div></div></div></> : <><div className={ui("card")}><div className={ui("result")}><div className={ui("resultLabel")}>Результат</div><div className={ui("resultValue")}>—</div><div className={ui("resultUnit")}>заполните параметры и выполните расчёт</div></div></div><div className={ui("tip")}><b>Как читать результат:</b> это стартовая оценка. После расчёта врач сможет изменить калорийность, БЖУ и каждый нутриент перед сохранением.</div></>}</aside>
      </div>}

      {tab === "pets" && <section className={ui("card")}><div className={ui("cardBody", "tableBody")}>
        <LocalRegistry tableName="pets-list" rows={pets.map(pet => ({ ...pet, speciesLabel: pet.species === "CAT" ? "Кошка" : "Собака", customerName: pet.customer?.name ?? "Без клиента" }))}
          columns={[{ name: "name", label: "Питомец" }, { name: "speciesLabel", label: "Вид" }, { name: "customerName", label: "Клиент" }, { name: "actualWeight", label: "Вес, кг" }, { name: "idealWeight", label: "Идеальный вес" }, { name: "bcs", label: "BCS" }]}
          createButton={<button className={ui("primary")} onClick={() => open({ entity: "pets", initial: { customerId: selectedCustomerId ?? "" }, onCreated: () => void loadData() })}>Создать питомца</button>}
          actionCell={(_, pet) => <div className={ui("actions")}><button className={ui("secondary")} onClick={() => choosePet(pet)}>Рассчитать</button><button className={ui("danger")} onClick={() => void removePet(pet.id)}>Удалить</button></div>}
          customColumns={[{ id: "assignCustomer", header: "Привязка к клиенту", width: 260, render: (_, pet) => <EntitySelect entity="customers" label="Клиент" value={pet.customerId ?? ""} onChange={value => void assignCustomer(pet.id, value)} /> }]} />
        {error && <p role="alert" className={ui("error")}>{error}</p>}
      </div></section>}

      {tab === "history" && <section className={ui("card")}><div className={ui("cardBody", "tableBody")}><LocalRegistry tableName="calculations-history" rows={history.map(item => ({ ...item, petName: item.pet?.name ?? "Без карточки", moduleName: item.module.name }))} columns={[{ name: "petName", label: "Питомец" }, { name: "moduleName", label: "Методика" }, { name: "adjustedEnergy", label: "ккал/сут" }, { name: "createdAt", label: "Дата" }]} formatCellValue={(column, value) => column === "createdAt" ? new Date(String(value)).toLocaleString("ru-RU") : String(value ?? "—")} /></div></section>}

      {tab === "info" && <InfoPage />}
  </div>;
}
