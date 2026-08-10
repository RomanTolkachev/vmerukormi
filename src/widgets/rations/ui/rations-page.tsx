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
} from "@/entities/ration/model/types";

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: digits });
}

export function RationsPage({
  rations,
  pets,
  selectedPetId,
}: {
  rations: RationListEntry[];
  pets: RationPetOption[];
  selectedPetId?: string;
}) {
  const router = useRouter();
  const initialPet = pets.find((pet) => pet.id === selectedPetId) ?? null;
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [petId, setPetId] = useState(initialPet?.id ?? "");
  const [mode, setMode] = useState<RationMode>("DAILY");
  const [targetEnergy, setTargetEnergy] = useState(
    initialPet?.latestEnergy ? String(initialPet.latestEnergy) : "",
  );
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

  function choosePet(value: string) {
    setPetId(value);
    const pet = pets.find((item) => item.id === value);
    setTargetEnergy(pet?.latestEnergy ? String(pet.latestEnergy) : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const ration = await createRation({
        name,
        petId: petId || null,
        mode,
        targetEnergy: targetEnergy ? Number(targetEnergy) : undefined,
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
                  <span>Питомец</span>
                  <select className={ui("input")} value={petId} onChange={(event) => choosePet(event.target.value)}>
                    <option value="">Без питомца</option>
                    {pets.map((pet) => (
                      <option value={pet.id} key={pet.id}>
                        {pet.name}{pet.customerName ? ` — ${pet.customerName}` : ""}
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
                    {petId ? "Предложена из последнего расчёта питомца" : "Можно указать вручную"}
                  </div>
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
