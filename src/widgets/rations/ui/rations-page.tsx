"use client";

import { ui } from "@/shared/ui/styles/ui";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createRation } from "@/features/rations/api/rations-api";
import type {
  RationListEntry,
  RationMode,
  RationPetOption,
  RationCalculationOption,
  RationCustomerOption,
} from "@/entities/ration/model/types";

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: digits });
}

export function RationsPage({
  rations,
  customers,
  pets,
  calculations,
  selectedPetId,
}: {
  rations: RationListEntry[];
  customers: RationCustomerOption[];
  pets: RationPetOption[];
  calculations: RationCalculationOption[];
  selectedPetId?: string;
}) {
  const router = useRouter();
  const initialPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const initialCalculation = calculations.find((calculation) => calculation.petId === initialPet?.id) ?? null;
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState(initialPet?.customerId ?? "");
  const [petId, setPetId] = useState(initialPet?.id ?? "");
  const [calculationId, setCalculationId] = useState(initialCalculation?.id ?? "");
  const [mode, setMode] = useState<RationMode>("DAILY");
  const [targetEnergy, setTargetEnergy] = useState(
    initialCalculation?.adjustedEnergy ? String(initialCalculation.adjustedEnergy) : "",
  );
  const [tolerancePercent, setTolerancePercent] = useState("10");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rations;
    return rations.filter((ration) =>
      [ration.name, ration.pet?.name, ration.pet?.customerName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rations, search]);

  const availablePets = useMemo(
    () => pets.filter((pet) => customerId ? pet.customerId === customerId : pet.customerId === null),
    [customerId, pets],
  );
  const availableCalculations = useMemo(
    () => calculations.filter((calculation) => calculation.petId === petId),
    [calculations, petId],
  );

  function chooseCustomer(value: string) {
    setCustomerId(value);
    setPetId("");
    setCalculationId("");
    setTargetEnergy("");
  }

  function choosePet(value: string) {
    setPetId(value);
    setCalculationId("");
    setTargetEnergy("");
  }

  function chooseCalculation(value: string) {
    setCalculationId(value);
    const calculation = calculations.find((item) => item.id === value);
    setPetId(calculation?.petId ?? "");
    setTargetEnergy(calculation ? String(calculation.adjustedEnergy) : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const ration = await createRation({
        name,
        petId: petId || null,
        calculationId: calculationId || null,
        mode,
        targetEnergy: targetEnergy ? Number(targetEnergy) : undefined,
        tolerancePercent: Number(tolerancePercent),
        note: note || null,
      });
      router.push(`/rations/${ration.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать рацион");
      setPending(false);
    }
  }

  return (
    <div className={ui("pageLayout", "rationsPage")}>
      <section className={ui("hero", "rationHero")}>
        <div>
          <h1>Рационы</h1>
          <p>
            Собирайте питание из продуктов, сравнивайте его энергию с потребностью
            питомца и контролируйте БЖУ и нутриенты.
          </p>
        </div>
        <span className={ui("badge")}>{rations.length} сохранено</span>
      </section>

      <div className={ui("rationListGrid")}>
        <section className={ui("card")}>
          <div className={ui("cardHead")}>
            <div>
              <h2>Журнал рационов</h2>
              <div className={ui("meta")}>Откройте рацион, чтобы изменить его состав</div>
            </div>
          </div>
          <div className={ui("cardBody", "rationListBody")}>
            <input
              className={ui("input", "rationSearch")}
              aria-label="Поиск рационов"
              placeholder="Название, клиент или питомец"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {filtered.length ? (
              <div className={ui("rationList")}>
                {filtered.map((ration) => (
                  <Link className={ui("rationListItem")} href={`/rations/${ration.id}`} key={ration.id}>
                    <div className={ui("rationListMain")}>
                      <strong>{ration.name}</strong>
                      <span>
                        {ration.pet?.name ?? "Без питомца"}
                        {ration.pet?.customerName ? ` · ${ration.pet.customerName}` : ""}
                      </span>
                    </div>
                    <div className={ui("rationListStats")}>
                      <span>{ration.mode === "DAILY" ? "День" : "Неделя"}</span>
                      <b>{formatNumber(ration.totalCalories)} / {formatNumber(ration.targetEnergy)} ккал</b>
                      <small>{ration.itemCount} продуктов · {formatNumber(ration.totalGrams)} г</small>
                    </div>
                    <span className={ui("rationOpen")}>Открыть →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={ui("empty", "rationEmpty")}>
                {search ? "По запросу ничего не найдено" : "Рационов пока нет"}
              </div>
            )}
          </div>
        </section>

        <section className={ui("card")}>
          <form onSubmit={submit}>
            <div className={ui("cardHead")}><h2>Новый рацион</h2></div>
            <div className={ui("cardBody")}>
              <div className={ui("formGrid", "single")}>
                <label className={ui("field")}>
                  <span>Название</span>
                  <input className={ui("input")} value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className={ui("field")}>
                  <span>Хозяин</span>
                  <select className={ui("input")} value={customerId} onChange={(event) => chooseCustomer(event.target.value)}>
                    <option value="">Без хозяина</option>
                    {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}
                  </select>
                </label>
                <label className={ui("field")}>
                  <span>Питомец</span>
                  <select className={ui("input")} value={petId} onChange={(event) => choosePet(event.target.value)}>
                    <option value="">Не выбран</option>
                    {availablePets.map((pet) => <option value={pet.id} key={pet.id}>{pet.name}</option>)}
                  </select>
                  {!availablePets.length && <div className={ui("fieldHint")}>{customerId ? "У хозяина нет питомцев" : "Нет питомцев без хозяина"}</div>}
                </label>
                <label className={ui("field")}>
                  <span>Расчёт нормы</span>
                  <select className={ui("input", "highlight")} value={calculationId} onChange={(event) => chooseCalculation(event.target.value)} disabled={!petId}>
                    <option value="">{petId ? "Выберите расчёт" : "Сначала выберите питомца"}</option>
                    {availableCalculations.map((calculation) => (
                      <option value={calculation.id} key={calculation.id}>
                        {calculation.petName ?? "Без питомца"} · {calculation.moduleName} · {new Date(calculation.createdAt).toLocaleDateString("ru-RU")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ui("field")}>
                  <span>Режим</span>
                  <select className={ui("input")} value={mode} onChange={(event) => setMode(event.target.value as RationMode)}>
                    <option value="DAILY">На день</option>
                    <option value="WEEKLY">На неделю</option>
                  </select>
                </label>
                <label className={ui("field")}>
                  <span>Целевая энергия, ккал/сут</span>
                  <input className={ui("input", "highlight")} type="number" min="0" step="1" value={targetEnergy} onChange={(event) => setTargetEnergy(event.target.value)} />
                  <div className={ui("fieldHint")}>
                    {calculationId ? "Зафиксирована выбранным расчётом" : "Можно указать вручную"}
                  </div>
                </label>
                <label className={ui("field")}>
                  <span>Допустимое превышение, %</span>
                  <input className={ui("input")} type="number" min="0" max="100" step="1" value={tolerancePercent} onChange={(event) => setTolerancePercent(event.target.value)} required />
                  <div className={ui("fieldHint")}>Значения выше этого диапазона подсвечиваются красным</div>
                </label>
                <label className={ui("field")}>
                  <span>Заметка</span>
                  <textarea className={ui("input")} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
                </label>
              </div>
              <div className={ui("actions")}>
                <button className={ui("primary")} disabled={pending}>
                  {pending ? "Создаём…" : "Создать и наполнить"}
                </button>
              </div>
              {error && <div className={ui("error")}>{error}</div>}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
