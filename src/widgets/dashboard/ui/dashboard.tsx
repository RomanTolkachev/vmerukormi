"use client";

import { ui } from "@/shared/ui/styles/ui";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { getBreeds } from "@/entities/breed/api/get-breeds";
import type { Breed } from "@/entities/breed/model/types";
import { getCalculations } from "@/entities/calculation/api/get-calculations";
import type { CalculationHistoryItem, EnergyResult } from "@/entities/calculation/model/types";
import type { CalculationModule } from "@/entities/module/model/types";
import { getCustomers } from "@/entities/customer/api/get-customers";
import type { CustomerOption } from "@/entities/customer/model/types";
import { getPets } from "@/entities/pet/api/get-pets";
import { calculateBcs } from "@/entities/pet/lib/calculate-bcs";
import type { Pet, PetDraft, Sex } from "@/entities/pet/model/types";
import { calculateEnergy } from "@/features/calculate-energy/api/calculate-energy";
import { createPet as createPetRequest } from "@/features/create-pet/api/create-pet";
import { deletePet } from "@/features/delete-pet/api/delete-pet";
import { updatePetCustomer } from "@/features/update-pet-customer/api/update-pet-customer";
import { NumberField } from "@/shared/ui/number-field";
import { InfoPage } from "@/widgets/info/ui/info-page";

type Form = { petId: string; moduleId: string; breedId: string; sex: Sex | ""; actualWeight: number; idealWeight: number; bcs: number; energyFactor: number; lactationWeek: number; childrenCount: number };
export type DashboardTab = "calc" | "pets" | "history" | "modules" | "info";

const calculationDefaults: Form = { petId: "", moduleId: "cat-adult", breedId: "", sex: "", actualWeight: 5, idealWeight: 5, bcs: 5, energyFactor: 1, lactationWeek: 1, childrenCount: 0 };
const petDefaults: PetDraft = { name: "", species: "CAT", breedId: "", customerId: "", sex: "", actualWeight: 5, idealWeight: 5, bcs: 5 };

export function Dashboard({ initialModules, initialTab = "calc", selectedPetId, selectedCustomerId }: { initialModules: CalculationModule[]; initialTab?: DashboardTab; selectedPetId?: string; selectedCustomerId?: string }) {
  const router = useRouter();
  const tab = initialTab;
  const [pets, setPets] = useState<Pet[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [error, setError] = useState("");
  const calculationForm = useForm<Form>({ defaultValues: calculationDefaults });
  const petForm = useForm<PetDraft>({ defaultValues: petDefaults });
  const moduleId = useWatch({ control: calculationForm.control, name: "moduleId" });
  const calcBreedId = useWatch({ control: calculationForm.control, name: "breedId" });
  const calcSex = useWatch({ control: calculationForm.control, name: "sex" });
  const calcActual = useWatch({ control: calculationForm.control, name: "actualWeight" });
  const calcIdeal = useWatch({ control: calculationForm.control, name: "idealWeight" });
  const petSpecies = useWatch({ control: petForm.control, name: "species" });
  const petBreedId = useWatch({ control: petForm.control, name: "breedId" });
  const petSex = useWatch({ control: petForm.control, name: "sex" });
  const petActual = useWatch({ control: petForm.control, name: "actualWeight" });
  const petIdeal = useWatch({ control: petForm.control, name: "idealWeight" });
  const selectedModule = useMemo(() => initialModules.find((m) => m.id === moduleId)!, [moduleId, initialModules]);
  const isLactation = moduleId.includes("lactation");
  const calcBreeds = useMemo(() => breeds.filter((breed) => breed.species === selectedModule.species), [breeds, selectedModule.species]);
  const petBreeds = useMemo(() => breeds.filter((breed) => breed.species === petSpecies), [breeds, petSpecies]);

  async function loadData() {
    const [petRows, historyRows, breedRows, customerRows] = await Promise.all([getPets(), getCalculations(), getBreeds(), getCustomers()]);
    setPets(petRows);
    setHistory(historyRows);
    setBreeds(breedRows);
    setCustomers(customerRows);
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getPets(controller.signal), getCalculations(controller.signal), getBreeds(controller.signal), getCustomers(controller.signal)]).then(([petRows, historyRows, breedRows, customerRows]) => {
      setPets(petRows);
      setHistory(historyRows);
      setBreeds(breedRows);
      setCustomers(customerRows);
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
    const breed = breeds.find((item) => item.id === petBreedId);
    if (!breed || !petSex) return;
    petForm.setValue("idealWeight", petSex === "MALE" ? breed.maleIdealWeight : breed.femaleIdealWeight, { shouldDirty: true });
  }, [breeds, petBreedId, petSex, petForm]);

  useEffect(() => {
    petForm.setValue("bcs", calculateBcs(petActual, petIdeal));
  }, [petActual, petIdeal, petForm]);

  useEffect(() => {
    if (calcBreedId && !calcBreeds.some((breed) => breed.id === calcBreedId)) calculationForm.setValue("breedId", "");
  }, [calcBreedId, calcBreeds, calculationForm]);

  useEffect(() => {
    petForm.setValue("breedId", "");
  }, [petSpecies, petForm]);

  useEffect(() => {
    if (tab !== "calc" || !selectedPetId || calculationForm.getValues("petId") === selectedPetId) return;
    const pet = pets.find((item) => item.id === selectedPetId);
    if (!pet) return;
    const compatible = initialModules.find((module) => module.species === pet.species);
    calculationForm.reset({ ...calculationDefaults, petId: pet.id, breedId: pet.breedId ?? "", sex: pet.sex ?? "", actualWeight: pet.actualWeight, idealWeight: pet.idealWeight, bcs: pet.bcs, moduleId: compatible?.id ?? calculationDefaults.moduleId });
  }, [calculationForm, initialModules, pets, selectedPetId, tab]);

  useEffect(() => {
    if (tab !== "pets" || !selectedCustomerId || petForm.getValues("customerId") === selectedCustomerId) return;
    if (customers.some((customer) => customer.id === selectedCustomerId)) petForm.setValue("customerId", selectedCustomerId);
  }, [customers, petForm, selectedCustomerId, tab]);

  function choosePet(pet: Pet) {
    if (tab !== "calc") {
      router.push(`/?petId=${encodeURIComponent(pet.id)}`);
      return;
    }
    const compatible = initialModules.find((m) => m.species === pet.species);
    calculationForm.reset({ ...calculationDefaults, petId: pet.id, breedId: pet.breedId ?? "", sex: pet.sex ?? "", actualWeight: pet.actualWeight, idealWeight: pet.idealWeight, bcs: pet.bcs, moduleId: compatible?.id ?? moduleId });
    setResult(null);
  }

  const calculate = calculationForm.handleSubmit(async (form) => {
    setError("");
    try {
      setResult(await calculateEnergy({ moduleId: form.moduleId, actualWeight: form.actualWeight, idealWeight: form.idealWeight, bcs: form.bcs, energyFactor: form.energyFactor, lactationWeek: form.lactationWeek, childrenCount: form.childrenCount, petId: form.petId || null }));
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить расчёт");
    }
  });

  const createPet = petForm.handleSubmit(async (draft) => {
    setError("");
    try {
      await createPetRequest(draft);
      petForm.reset(petDefaults);
      await loadData();
    } catch {
      setError("Проверьте данные питомца");
    }
  });

  async function removePet(id: string) { await deletePet(id); await loadData(); }
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

      {tab === "calc" && <div className={ui("grid")}>
        <section className={ui("card")}><form onSubmit={calculate}><div className={ui("cardHead")}><h2>Параметры расчёта</h2><span className={ui("meta")}>ОЭ, ккал/сут</span></div><div className={ui("cardBody")}>
          <div className={ui("formGrid")}>
            <div className={ui("field", "full")}><label>Питомец</label><select className={ui("input")} {...calculationForm.register("petId")} onChange={(e) => { const pet = pets.find(p=>p.id===e.target.value); if (pet) choosePet(pet); else calculationForm.setValue("petId", ""); }}><option value="">Без сохранённой карточки</option>{pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className={ui("field", "full")}><label>Модуль</label><select className={ui("input", "highlight")} {...calculationForm.register("moduleId")}>{initialModules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div className={ui("field")}><label>Порода</label><select className={ui("input")} {...calculationForm.register("breedId")}><option value="">Не выбрана</option>{calcBreeds.map(breed=><option key={breed.id} value={breed.id}>{breed.nameRu}</option>)}</select></div>
            <div className={ui("field")}><label>Пол</label><select className={ui("input")} {...calculationForm.register("sex")}><option value="">Не выбран</option><option value="MALE">Самец</option><option value="FEMALE">Самка</option></select></div>
            <NumberField label="Фактическая масса, кг" registration={calculationForm.register("actualWeight", { valueAsNumber: true, min: 0.1, max: 150 })}/>
            <NumberField label="Идеальная / взрослая масса, кг" registration={calculationForm.register("idealWeight", { valueAsNumber: true, min: 0.1, max: 150 })} hint={calcBreedId && calcSex ? "Предзаполнено по породе и полу; значение можно изменить" : undefined}/>
            <NumberField label="BCS, 1–9" registration={calculationForm.register("bcs", { valueAsNumber: true })} min={1} max={9} step={1} readOnly hint="Автоматически рассчитан из фактической и идеальной массы"/>
            <NumberField label="Поправка ОЭ" registration={calculationForm.register("energyFactor", { valueAsNumber: true, min: 0.1, max: 5 })} min={0.1} max={5} step={0.05}/>
            {isLactation && <><NumberField label="Неделя лактации" registration={calculationForm.register("lactationWeek", { valueAsNumber: true })} min={1} max={12} step={1}/><NumberField label="Количество детёнышей" registration={calculationForm.register("childrenCount", { valueAsNumber: true })} min={0} max={20} step={1}/></>}
          </div>
          <div className={ui("formulaBox")}><strong>Формула модуля</strong><code>{selectedModule.formula}</code></div>
          <div className={ui("actions")}><button className={ui("primary")} type="submit">Рассчитать и сохранить</button><button className={ui("secondary")} type="button" onClick={()=>setResult(null)}>Сбросить результат</button></div>
          {error && <div className={ui("error")}>{error}</div>}
        </div></form></section>
        <aside><div className={ui("card")}>{result ? <div className={ui("result")}><div className={ui("resultLabel")}>Суточная обменная энергия</div><div className={ui("resultValue")}>{result.adjustedEnergy}</div><div className={ui("resultUnit")}>ккал в сутки</div><div className={ui("resultSub")}><span>Базовый расчёт</span><b>{result.baseEnergy} ккал</b></div></div> : <div className={ui("result")}><div className={ui("resultLabel")}>Результат</div><div className={ui("resultValue")}>—</div><div className={ui("resultUnit")}>заполните параметры и выполните расчёт</div></div>}</div><div className={ui("tip")}><b>Как читать результат:</b> это стартовая оценка. Контролируйте динамику массы и BCS и корректируйте поле «Поправка ОЭ».</div></aside>
      </div>}

      {tab === "pets" && <div className={ui("grid")}><section className={ui("card")}><div className={ui("cardHead")}><h2>Карточки питомцев</h2><span className={ui("meta")}>{pets.length} всего</span></div><div className={ui("cardBody")}><div className={ui("list")}>{pets.length ? pets.map(p=><div className={ui("pet")} key={p.id}><div><div className={ui("petName")}>{p.species==='CAT'?'🐈':'🐕'} {p.name}</div><div className={ui("meta")}>{p.customer ? `Клиент: ${p.customer.name} · ` : "Без клиента · "}{p.breed?.nameRu ? `${p.breed.nameRu} · ` : ""}{p.sex === "MALE" ? "самец · " : p.sex === "FEMALE" ? "самка · " : ""}факт. {p.actualWeight} кг · идеал {p.idealWeight} кг · BCS {p.bcs}/9</div></div><div className={ui("actions", "petActions")}><select className={ui("input", "petCustomerSelect")} aria-label={`Клиент для ${p.name}`} value={p.customerId ?? ""} onChange={(event)=>void assignCustomer(p.id, event.target.value)}><option value="">Без клиента</option>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><button className={ui("secondary")} onClick={()=>choosePet(p)}>Рассчитать</button><button className={ui("danger")} onClick={()=>removePet(p.id)}>Удалить</button></div></div>) : <div className={ui("empty")}>Пока нет сохранённых питомцев</div>}</div></div></section><section className={ui("card")}><form onSubmit={createPet}><div className={ui("cardHead")}><h2>Новый питомец</h2></div><div className={ui("cardBody")}><div className={ui("formGrid")}><div className={ui("field", "full")}><label>Имя</label><input className={ui("input")} {...petForm.register("name", { required: true })}/></div><div className={ui("field", "full")}><label>Клиент</label><select className={ui("input")} {...petForm.register("customerId")}><option value="">Без клиента</option>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>{!customers.length && <div className={ui("fieldHint")}>Сначала добавьте клиента во вкладке «Клиенты» или сохраните питомца без привязки.</div>}</div><div className={ui("field", "full")}><label>Вид</label><select className={ui("input")} {...petForm.register("species")}><option value="CAT">Кошка</option><option value="DOG">Собака</option></select></div><div className={ui("field")}><label>Порода</label><select className={ui("input")} {...petForm.register("breedId")}><option value="">Не выбрана</option>{petBreeds.map(breed=><option key={breed.id} value={breed.id}>{breed.nameRu}</option>)}</select></div><div className={ui("field")}><label>Пол</label><select className={ui("input")} {...petForm.register("sex")}><option value="">Не выбран</option><option value="MALE">Самец</option><option value="FEMALE">Самка</option></select></div><NumberField label="Фактическая масса" registration={petForm.register("actualWeight", { valueAsNumber: true, min: 0.1, max: 150 })}/><NumberField label="Идеальная масса" registration={petForm.register("idealWeight", { valueAsNumber: true, min: 0.1, max: 150 })} hint={petBreedId && petSex ? "Предзаполнено по породе и полу" : undefined}/><NumberField label="BCS" registration={petForm.register("bcs", { valueAsNumber: true })} min={1} max={9} step={1} readOnly hint="Рассчитан автоматически"/></div><div className={ui("actions")}><button className={ui("primary")} type="submit">Сохранить карточку</button></div>{error&&<div className={ui("error")}>{error}</div>}</div></form></section></div>}

      {tab === "history" && <section className={ui("card")}><div className={ui("cardHead")}><h2>Последние расчёты</h2><span className={ui("meta")}>до 50 записей</span></div><div className={ui("cardBody")}><div className={ui("list")}>{history.length ? history.map(item=><div className={ui("historyItem")} key={item.id}><div><div className={ui("petName")}>{item.pet?.name ?? "Без карточки"}</div><div className={ui("meta")}>{item.module.name} · {new Date(item.createdAt).toLocaleString('ru-RU')}</div></div><div className={ui("historyEnergy")}>{item.adjustedEnergy}<div className={ui("meta")}>ккал/сут</div></div></div>) : <div className={ui("empty")}>История появится после первого расчёта</div>}</div></div></section>}

      {tab === "modules" && <section className={ui("card")}><div className={ui("cardHead")}><h2>Справочник формул</h2><span className={ui("meta")}>{initialModules.length} модулей</span></div><div className={ui("cardBody")}><div className={ui("list")}>{initialModules.map(m=><div className={ui("moduleItem")} key={m.id}><div className={ui("moduleTop")}><b>{m.name}</b><span className={ui("species")}>{m.species==='CAT'?'Кошка':'Собака'}</span></div><div className={ui("moduleFormula")}>{m.formula}</div><div className={ui("meta")}>{m.description}</div></div>)}</div><div className={ui("notice")}>AW — фактическая масса, IW — идеальная или ожидаемая взрослая масса. Формулы воспроизведены по ответам исходного API на синтетических данных.</div></div></section>}

      {tab === "info" && <InfoPage />}
  </div>;
}
