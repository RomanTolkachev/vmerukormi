"use client";

import { ui } from "@/shared/ui/styles/ui";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addRationItem,
  deleteRation,
  deleteRationItem,
  updateRation,
  updateRationItem,
} from "@/features/rations/api/rations-api";
import type {
  RationEditorValue,
  RationItem,
  RationMode,
  RationPetOption,
  RationProduct,
} from "@/entities/ration/model/types";

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatNumber(value: number, digits = 1) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: digits });
}

function itemValues(item: RationItem) {
  const factor = item.grams / item.product.baseQuantity;
  return {
    calories: item.product.calories * factor,
    protein: item.product.protein * factor,
    fat: item.product.fat * factor,
    carbs: item.product.carbs * factor,
  };
}

export function RationEditor({
  initialRation,
  products,
  pets,
}: {
  initialRation: RationEditorValue;
  products: RationProduct[];
  pets: RationPetOption[];
}) {
  const router = useRouter();
  const [ration, setRation] = useState(initialRation);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [measureId, setMeasureId] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [day, setDay] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const selectedProduct = products.find((product) => product.id === productId);

  const totals = useMemo(() => {
    const enabled = ration.items.filter((item) => item.enabled);
    const raw = enabled.reduce(
      (sum, item) => {
        const value = itemValues(item);
        sum.grams += item.grams;
        sum.calories += value.calories;
        sum.protein += value.protein;
        sum.fat += value.fat;
        sum.carbs += value.carbs;
        return sum;
      },
      { grams: 0, calories: 0, protein: 0, fat: 0, carbs: 0 },
    );
    const divisor = ration.mode === "WEEKLY" ? 7 : 1;
    return {
      totalGrams: raw.grams,
      grams: raw.grams / divisor,
      calories: raw.calories / divisor,
      protein: raw.protein / divisor,
      fat: raw.fat / divisor,
      carbs: raw.carbs / divisor,
    };
  }, [ration.items, ration.mode]);

  const nutrientTotals = useMemo(() => {
    const result = new Map<string, { code: string; name: string; unit: string; category: string; amount: number }>();
    const divisor = ration.mode === "WEEKLY" ? 7 : 1;
    ration.items.filter((item) => item.enabled).forEach((item) => {
      const factor = item.grams / item.product.baseQuantity / divisor;
      item.product.nutrients.forEach((value) => {
        if (value.amount === null) return;
        const current = result.get(value.nutrientId);
        const amount = value.amount * factor;
        result.set(value.nutrientId, {
          ...value.nutrient,
          amount: (current?.amount ?? 0) + amount,
        });
      });
    });
    return [...result.values()].sort((a, b) =>
      `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`, "ru"),
    );
  }, [ration.items, ration.mode]);

  const energyPercent = ration.targetEnergy
    ? (totals.calories / ration.targetEnergy) * 100
    : 0;
  const energyStatus =
    energyPercent < 90 ? "Недобор" : energyPercent > 110 ? "Избыток" : "В диапазоне";

  async function saveHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await updateRation(ration.id, {
        name: ration.name,
        petId: ration.petId,
        mode: ration.mode,
        targetEnergy: ration.targetEnergy,
        note: ration.note,
      });
      if (ration.mode === "DAILY") {
        setRation((current) => ({
          ...current,
          items: current.items.map((item) => ({ ...item, day: 1 })),
        }));
      }
      setMessage("Параметры сохранены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить рацион");
    } finally {
      setPending(false);
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId) return;
    setPending(true);
    setError("");
    try {
      const item = await addRationItem(ration.id, {
        productId,
        measureId: measureId || null,
        quantity: Number(quantity),
        day: Number(day),
      });
      setRation((current) => ({ ...current, items: [...current.items, item] }));
      setMessage("Продукт добавлен");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось добавить продукт");
    } finally {
      setPending(false);
    }
  }

  async function patchItem(itemId: string, patch: Partial<{ measureId: string | null; quantity: number; day: number; enabled: boolean }>) {
    setError("");
    try {
      const updated = await updateRationItem(ration.id, itemId, patch);
      setRation((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === itemId ? updated : item)),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось изменить продукт");
    }
  }

  async function removeItem(itemId: string) {
    setError("");
    try {
      await deleteRationItem(ration.id, itemId);
      setRation((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить продукт");
    }
  }

  async function removeRation() {
    if (!window.confirm(`Удалить рацион «${ration.name}»?`)) return;
    try {
      await deleteRation(ration.id);
      router.push("/rations");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить рацион");
    }
  }

  return (
    <div className={ui("pageLayout", "rationEditorPage")}>
      <div className={ui("rationEditorTop")}>
        <div>
          <Link className={ui("backLink")} href="/rations">← Все рационы</Link>
          <h1>{ration.name}</h1>
          <div className={ui("meta")}>
            {ration.mode === "DAILY" ? "Суточный рацион" : "Недельный рацион"}
            {ration.petId ? ` · ${pets.find((pet) => pet.id === ration.petId)?.name ?? "Питомец"}` : " · Без питомца"}
          </div>
        </div>
        <div className={ui("rationEditorActions")}>
          <a className={ui("secondary", "linkButton")} href={`/api/rations/${ration.id}/export`}>Выгрузить в Excel</a>
          <button className={ui("danger")} type="button" onClick={() => void removeRation()}>Удалить рацион</button>
        </div>
      </div>

      <section className={ui("rationSummaryGrid")} aria-label="Итоги рациона">
        <div className={ui("rationEnergyCard")}>
          <span>Энергия в сутки</span>
          <strong>{formatNumber(totals.calories, 0)} <small>ккал</small></strong>
          <div className={ui("energyProgress")}><i style={{ width: `${Math.min(energyPercent, 100)}%` }} /></div>
          <small>{formatNumber(energyPercent, 0)}% от цели · {ration.targetEnergy ? energyStatus : "цель не указана"}</small>
        </div>
        <div className={ui("rationMetric")}><span>Вес</span><strong>{formatNumber(totals.grams)} г</strong><small>{ration.mode === "WEEKLY" ? `${formatNumber(totals.totalGrams)} г за неделю` : "в сутки"}</small></div>
        <div className={ui("rationMetric")}><span>Белок</span><strong>{formatNumber(totals.protein)} г</strong><small>в сутки</small></div>
        <div className={ui("rationMetric")}><span>Жир</span><strong>{formatNumber(totals.fat)} г</strong><small>в сутки</small></div>
        <div className={ui("rationMetric")}><span>Углеводы</span><strong>{formatNumber(totals.carbs)} г</strong><small>в сутки</small></div>
      </section>

      <div className={ui("rationEditorGrid")}>
        <div className={ui("rationEditorMain")}>
          <section className={ui("card")}>
            <div className={ui("cardHead")}>
              <div><h2>Состав рациона</h2><div className={ui("meta")}>Количество пересчитывается сразу после изменения</div></div>
            </div>
            <div className={ui("cardBody")}>
              {ration.items.length ? (
                <div className={ui("rationItemsWrap")}>
                  <table className={ui("rationItemsTable")}>
                    <thead><tr><th>Вкл.</th><th>Продукт</th>{ration.mode === "WEEKLY" && <th>День</th>}<th>Мера</th><th>Количество</th><th>Граммы</th><th>Энергия</th><th /></tr></thead>
                    <tbody>
                      {ration.items.map((item) => {
                        const value = itemValues(item);
                        return (
                          <tr key={item.id} className={ui(!item.enabled && "rationItemDisabled")}>
                            <td><input aria-label={`Включить ${item.product.name}`} type="checkbox" checked={item.enabled} onChange={(event) => void patchItem(item.id, { enabled: event.target.checked })} /></td>
                            <td><b>{item.product.name}</b><small>{formatNumber(value.protein)} Б · {formatNumber(value.fat)} Ж · {formatNumber(value.carbs)} У</small></td>
                            {ration.mode === "WEEKLY" && <td><select className={ui("input", "compactInput")} aria-label={`День для ${item.product.name}`} value={item.day} onChange={(event) => void patchItem(item.id, { day: Number(event.target.value) })}>{days.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></td>}
                            <td><select className={ui("input", "compactInput")} aria-label={`Мера для ${item.product.name}`} value={item.measureId ?? ""} onChange={(event) => void patchItem(item.id, { measureId: event.target.value || null })}><option value="">Граммы</option>{item.product.measures.map((measure) => <option value={measure.id} key={measure.id}>{measure.name}</option>)}</select></td>
                            <td><input className={ui("input", "compactInput", "quantityInput")} aria-label={`Количество ${item.product.name}`} type="number" min="0.01" step="0.01" defaultValue={item.quantity} onBlur={(event) => void patchItem(item.id, { quantity: Number(event.target.value) })} /></td>
                            <td>{formatNumber(item.grams)} г</td>
                            <td><b>{formatNumber(value.calories, 0)}</b> ккал</td>
                            <td><button className={ui("danger")} type="button" onClick={() => void removeItem(item.id)}>Удалить</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className={ui("empty")}>Добавьте первый продукт в рацион</div>}
            </div>
          </section>

          <section className={ui("card")}>
            <div className={ui("cardHead")}><div><h2>Нутриенты</h2><div className={ui("meta")}>Среднее значение в сутки по включённым продуктам</div></div></div>
            <div className={ui("cardBody")}>
              {nutrientTotals.length ? (
                <div className={ui("nutrientSummaryGrid")}>
                  {nutrientTotals.map((nutrient) => <div key={`${nutrient.category}-${nutrient.code}`}><span>{nutrient.code}</span><b>{formatNumber(nutrient.amount, 2)} {nutrient.unit}</b><small>{nutrient.name}</small></div>)}
                </div>
              ) : <div className={ui("empty")}>У добавленных продуктов пока не заполнен нутриентный состав</div>}
            </div>
          </section>
        </div>

        <aside className={ui("rationEditorSide")}>
          <section className={ui("card")}>
            <form onSubmit={addItem}>
              <div className={ui("cardHead")}><h2>Добавить продукт</h2></div>
              <div className={ui("cardBody")}>
                {products.length ? <div className={ui("formGrid", "single")}>
                  <label className={ui("field")}><span>Продукт</span><select className={ui("input")} value={productId} onChange={(event) => { setProductId(event.target.value); setMeasureId(""); }} required>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
                  <label className={ui("field")}><span>Мера</span><select className={ui("input")} value={measureId} onChange={(event) => setMeasureId(event.target.value)}><option value="">Граммы</option>{selectedProduct?.measures.map((measure) => <option value={measure.id} key={measure.id}>{measure.name} ({measure.grams} г)</option>)}</select></label>
                  <label className={ui("field")}><span>Количество</span><input className={ui("input")} type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
                  {ration.mode === "WEEKLY" && <label className={ui("field")}><span>День</span><select className={ui("input")} value={day} onChange={(event) => setDay(event.target.value)}>{days.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></label>}
                  <button className={ui("primary")} disabled={pending}>Добавить в рацион</button>
                </div> : <div className={ui("empty")}>Сначала создайте продукт в разделе «Продукты»<div className={ui("actions", "centeredActions")}><Link className={ui("secondary", "linkButton")} href="/products">Перейти к продуктам</Link></div></div>}
              </div>
            </form>
          </section>

          <section className={ui("card")}>
            <form onSubmit={saveHeader}>
              <div className={ui("cardHead")}><h2>Параметры</h2></div>
              <div className={ui("cardBody")}>
                <div className={ui("formGrid", "single")}>
                  <label className={ui("field")}><span>Название</span><input className={ui("input")} value={ration.name} onChange={(event) => setRation({ ...ration, name: event.target.value })} required /></label>
                  <label className={ui("field")}><span>Питомец</span><select className={ui("input")} value={ration.petId ?? ""} onChange={(event) => { const petId = event.target.value || null; const pet = pets.find((item) => item.id === petId); setRation({ ...ration, petId, targetEnergy: pet?.latestEnergy ?? ration.targetEnergy }); }}><option value="">Без питомца</option>{pets.map((pet) => <option value={pet.id} key={pet.id}>{pet.name}{pet.customerName ? ` — ${pet.customerName}` : ""}</option>)}</select></label>
                  <label className={ui("field")}><span>Режим</span><select className={ui("input")} value={ration.mode} onChange={(event) => setRation({ ...ration, mode: event.target.value as RationMode })}><option value="DAILY">На день</option><option value="WEEKLY">На неделю</option></select></label>
                  <label className={ui("field")}><span>Цель, ккал/сут</span><input className={ui("input", "highlight")} type="number" min="0" value={ration.targetEnergy} onChange={(event) => setRation({ ...ration, targetEnergy: Number(event.target.value) })} /></label>
                  <label className={ui("field")}><span>Заметка</span><textarea className={ui("input")} rows={4} value={ration.note ?? ""} onChange={(event) => setRation({ ...ration, note: event.target.value || null })} /></label>
                  <button className={ui("secondary")} disabled={pending}>Сохранить параметры</button>
                </div>
                {message && <div className={ui("rationMessage")}>{message}</div>}
                {error && <div className={ui("error")}>{error}</div>}
              </div>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
