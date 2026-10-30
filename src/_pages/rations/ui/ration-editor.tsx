"use client";

import { ui } from "@/shared/ui/styles";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addRationItem,
  deleteRation,
  deleteRationItem,
  updateRation,
  updateRationItem,
} from "@/features/rations";
import type {
  RationEditorValue,
  RationItem,
  RationMode,
  RationPetOption,
  RationProduct,
  RationCalculationOption,
  RationCustomerOption,
} from "@/entities/ration";
import { summarizeNutrients, targetStatus, targetStatusClass, targetStatusLabel } from "@/entities/ration";

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type ProductFocus =
  | { kind: "macro"; code: "protein" | "fat" | "carbs"; name: string; unit: string }
  | { kind: "nutrient"; nutrientId: string; name: string; unit: string };

function scoreProduct(product: RationProduct, focus: ProductFocus | null) {
  if (!focus || product.calories <= 0) return 0;
  const amount = focus.kind === "macro"
    ? product[focus.code]
    : product.nutrients.find((value) => value.nutrientId === focus.nutrientId)?.amount ?? 0;
  return amount / product.calories * 100;
}

function formatNumber(value: number, digits?: number) {
  const absolute = Math.abs(value);
  const maximumFractionDigits = digits ?? (absolute === 0 || absolute >= 10 ? 1 : absolute >= 1 ? 2 : absolute >= 0.01 ? 4 : 6);
  return value.toLocaleString("ru-RU", { maximumFractionDigits });
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
  customers,
  pets,
  calculations,
  nutrients,
}: {
  initialRation: RationEditorValue;
  products: RationProduct[];
  customers: RationCustomerOption[];
  pets: RationPetOption[];
  calculations: RationCalculationOption[];
  nutrients: { id: string; code: string; name: string; category: string; unit: string }[];
}) {
  const router = useRouter();
  const initialCustomerId = pets.find((pet) => pet.id === initialRation.petId)?.customerId ?? "";
  const [ration, setRation] = useState(initialRation);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [measureId, setMeasureId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productFocus, setProductFocus] = useState<ProductFocus | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [day, setDay] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const productPickerRef = useRef<HTMLElement>(null);
  const availableProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase("ru");
    return products
      .filter((product) => !query || product.name.toLocaleLowerCase("ru").includes(query))
      .sort((a, b) => productFocus ? scoreProduct(b, productFocus) - scoreProduct(a, productFocus) || a.name.localeCompare(b.name, "ru") : a.name.localeCompare(b.name, "ru"));
  }, [productFocus, productSearch, products]);
  const effectiveProductId = availableProducts.some((product) => product.id === productId) ? productId : availableProducts[0]?.id ?? "";
  const selectedProduct = products.find((product) => product.id === effectiveProductId);
  const selectedMeasure = selectedProduct?.measures.find((measure) => measure.id === measureId);
  const availablePets = useMemo(
    () => pets.filter((pet) => customerId ? pet.customerId === customerId : pet.customerId === null),
    [customerId, pets],
  );
  const availableCalculations = useMemo(
    () => calculations.filter((calculation) => calculation.petId === ration.petId),
    [calculations, ration.petId],
  );

  function focusProductPicker(focus: ProductFocus) {
    setProductFocus(focus);
    setProductId("");
    setMeasureId("");
    requestAnimationFrame(() => productPickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

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

  const nutrientSummary = useMemo(
    () => summarizeNutrients(ration.items, ration.mode, nutrients, ration.calculation?.nutrients),
    [ration.items, ration.mode, ration.calculation, nutrients],
  );
  const moistureSummary = nutrientSummary.find(({ nutrient }) => nutrient.code === "MO" && nutrient.unit === "г");
  const moisture = moistureSummary?.amount ?? 0;

  const energyPercent = ration.targetEnergy
    ? (totals.calories / ration.targetEnergy) * 100
    : 0;
  const energyComparison = targetStatus(totals.calories, ration.targetEnergy, ration.tolerancePercent);
  const proteinComparison = targetStatus(totals.protein, ration.calculation?.protein ?? 0, ration.tolerancePercent);
  const fatComparison = targetStatus(totals.fat, ration.calculation?.fat ?? 0, ration.tolerancePercent);
  const carbsComparison = targetStatus(totals.carbs, ration.calculation?.carbs ?? 0, ration.tolerancePercent);

  function chooseCustomer(value: string) {
    setCustomerId(value);
    setRation((current) => ({ ...current, petId: null, pet: null, calculationId: null, calculation: null, targetEnergy: 0 }));
  }

  function choosePet(value: string) {
    const pet = pets.find((item) => item.id === value) ?? null;
    setRation((current) => ({
      ...current,
      petId: pet?.id ?? null,
      pet: pet ? { id: pet.id, name: pet.name, customerName: pet.customerName } : null,
      calculationId: null,
      calculation: null,
      targetEnergy: 0,
    }));
  }

  async function saveHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await updateRation(ration.id, {
        name: ration.name,
        petId: ration.petId,
        calculationId: ration.calculationId,
        mode: ration.mode,
        targetEnergy: ration.targetEnergy,
        tolerancePercent: ration.tolerancePercent,
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
    if (!effectiveProductId) return;
    setPending(true);
    setError("");
    try {
      const item = await addRationItem(ration.id, {
        productId: effectiveProductId,
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
        <div className={ui("rationEnergyCard", targetStatusClass(energyComparison))}>
          <span>Энергия в сутки</span>
          <strong>{formatNumber(totals.calories, 0)} <small>ккал</small></strong>
          <div className={ui("energyProgress")}><i style={{ width: `${Math.min(energyPercent, 100)}%` }} /></div>
          <small>{ration.targetEnergy ? `цель ${formatNumber(ration.targetEnergy, 0)} ккал · ${formatNumber(energyPercent, 0)}% от цели` : "Целевая норма не задана"} · {targetStatusLabel(energyComparison, ration.tolerancePercent)}</small>
        </div>
        <div className={ui("rationMetric")}><span>Вес</span><strong>{formatNumber(totals.grams)} г</strong><small>{ration.mode === "WEEKLY" ? `${formatNumber(totals.totalGrams)} г за неделю` : "в сутки"}</small></div>
        <button type="button" className={ui("rationMetric", proteinComparison === "low" && "rationMetricAction", targetStatusClass(proteinComparison))} onClick={() => proteinComparison === "low" && focusProductPicker({ kind: "macro", code: "protein", name: "Белок", unit: "г" })}><span>Белок</span><strong>{formatNumber(totals.protein)} г</strong><small>{ration.calculation ? `норма ${formatNumber(ration.calculation.protein)} г · ${targetStatusLabel(proteinComparison, ration.tolerancePercent)}` : "в сутки"}</small></button>
        <button type="button" className={ui("rationMetric", fatComparison === "low" && "rationMetricAction", targetStatusClass(fatComparison))} onClick={() => fatComparison === "low" && focusProductPicker({ kind: "macro", code: "fat", name: "Жир", unit: "г" })}><span>Жир</span><strong>{formatNumber(totals.fat)} г</strong><small>{ration.calculation ? `норма ${formatNumber(ration.calculation.fat)} г · ${targetStatusLabel(fatComparison, ration.tolerancePercent)}` : "в сутки"}</small></button>
        <button type="button" className={ui("rationMetric", carbsComparison === "low" && "rationMetricAction", targetStatusClass(carbsComparison))} onClick={() => carbsComparison === "low" && focusProductPicker({ kind: "macro", code: "carbs", name: "Углеводы", unit: "г" })}><span>Углеводы</span><strong>{formatNumber(totals.carbs)} г</strong><small>{ration.calculation ? `норма ${formatNumber(ration.calculation.carbs)} г · ${targetStatusLabel(carbsComparison, ration.tolerancePercent)}` : "в сутки"}</small></button>
        <div className={ui("rationMetric")}><span>Влага</span><strong>{formatNumber(moisture)} г</strong><small>{moistureSummary?.complete ? "в сутки" : "в сутки · неполные данные"}</small></div>
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
                            <td>
                              <div className={ui("rationProductCell")}>
                                <b>{item.product.name}</b>
                                <Link className={ui("rationProductLink")} href={`/products/${item.product.id}`} target="_blank" rel="noopener noreferrer">Смотреть ↗</Link>
                              </div>
                              <small>{formatNumber(value.protein)} Б · {formatNumber(value.fat)} Ж · {formatNumber(value.carbs)} У</small>
                            </td>
                            {ration.mode === "WEEKLY" && <td><select className={ui("input", "compactInput")} aria-label={`День для ${item.product.name}`} value={item.day} onChange={(event) => void patchItem(item.id, { day: Number(event.target.value) })}>{days.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></td>}
                            <td><select className={ui("input", "compactInput")} aria-label={`Мера для ${item.product.name}`} value={item.measureId ?? ""} onChange={(event) => void patchItem(item.id, { measureId: event.target.value || null })}><option value="">Граммы</option>{item.product.measures.map((measure) => <option value={measure.id} key={measure.id}>{measure.name}</option>)}</select></td>
                            <td><input className={ui("input", "compactInput", "quantityInput")} aria-label={`Количество ${item.product.name}`} type="number" min="0.000001" step="any" defaultValue={item.quantity} onBlur={(event) => void patchItem(item.id, { quantity: Number(event.target.value) })} /></td>
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
              {nutrientSummary.length ? <div className={ui("nutrientSummaryGrid")}>{nutrientSummary.map(({ nutrient, amount, target, complete, missingItems }) => {
                const status = target && complete ? targetStatus(amount, target.targetAmount, ration.tolerancePercent) : null;
                return <div className={ui("nutrientSummaryCard", status && targetStatusClass(status))} key={nutrient.id}><span>{nutrient.code}</span><b>{target ? `${formatNumber(amount)} / ${formatNumber(target.targetAmount)}` : formatNumber(amount)} {nutrient.unit}</b><small>{nutrient.name}{!complete ? ` · ${missingItems ? `Нет данных у ${missingItems} позиций` : "Нет данных"}; 0 не подтверждает отсутствие нутриента` : ""}{status ? ` · ${targetStatusLabel(status, ration.tolerancePercent)}` : ""}</small></div>;
              })}</div> : <div className={ui("empty")}>Нутриенты пока не заполнены</div>}
            </div>
          </section>
        </div>

        <aside className={ui("rationEditorSide")}>
          <section className={ui("card")} ref={productPickerRef}>
            <form onSubmit={addItem}>
              <div className={ui("cardHead")}><h2>Добавить продукт</h2></div>
              <div className={ui("cardBody")}>
                {products.length ? <div className={ui("formGrid", "single")}>
                  {productFocus && <div className={ui("productFocus")}><span>Сортировка по содержанию на 100 ккал</span><b>{productFocus.name}</b><button type="button" onClick={() => setProductFocus(null)}>Сбросить</button></div>}
                  <label className={ui("field")}><span>Поиск по названию</span><input className={ui("input")} type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Начните вводить название" /></label>
                  <label className={ui("field")}><span>Продукт ({availableProducts.length})</span><select className={ui("input")} value={effectiveProductId} onChange={(event) => { setProductId(event.target.value); setMeasureId(""); }} required disabled={!availableProducts.length}>{availableProducts.length ? availableProducts.map((product) => <option value={product.id} key={product.id}>{product.name}{productFocus ? ` · ${formatNumber(scoreProduct(product, productFocus), 2)} ${productFocus.unit}/100 ккал` : ""}</option>) : <option value="">Ничего не найдено</option>}</select></label>
                  <label className={ui("field")}><span>Мера</span><select className={ui("input")} value={measureId} onChange={(event) => setMeasureId(event.target.value)}><option value="">Граммы</option>{selectedProduct?.measures.map((measure) => <option value={measure.id} key={measure.id}>{measure.name} ({measure.grams} г)</option>)}</select></label>
                  <label className={ui("field")}><span>Количество{selectedMeasure ? `, ${selectedMeasure.name}` : ", г"}</span><input className={ui("input")} type="number" min="0.000001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />{selectedMeasure && <div className={ui("fieldHint")}>{formatNumber(Number(quantity) * selectedMeasure.grams)} г продукта</div>}</label>
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
                  <label className={ui("field")}><span>Хозяин</span><select className={ui("input")} value={customerId} onChange={(event) => chooseCustomer(event.target.value)}><option value="">Без хозяина</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>
                  <label className={ui("field")}><span>Питомец</span><select className={ui("input")} value={ration.petId ?? ""} onChange={(event) => choosePet(event.target.value)}><option value="">Не выбран</option>{availablePets.map((pet) => <option value={pet.id} key={pet.id}>{pet.name}</option>)}</select>{!availablePets.length && <div className={ui("fieldHint")}>{customerId ? "У хозяина нет питомцев" : "Нет питомцев без хозяина"}</div>}</label>
                  <label className={ui("field")}><span>Расчёт нормы</span><select className={ui("input", "highlight")} value={ration.calculationId ?? ""} onChange={(event) => { const calculationId = event.target.value || null; const calculation = availableCalculations.find((item) => item.id === calculationId) ?? null; setRation({ ...ration, calculationId, calculation, targetEnergy: calculation?.adjustedEnergy ?? 0 }); }} disabled={!ration.petId}><option value="">{ration.petId ? "Выберите расчёт" : "Сначала выберите питомца"}</option>{availableCalculations.map((calculation) => <option value={calculation.id} key={calculation.id}>{calculation.moduleName} · {new Date(calculation.createdAt).toLocaleDateString("ru-RU")}</option>)}</select>{ration.petId && !availableCalculations.length && <div className={ui("fieldHint")}>У питомца пока нет сохранённых расчётов</div>}</label>
                  <label className={ui("field")}><span>Режим</span><select className={ui("input")} value={ration.mode} onChange={(event) => setRation({ ...ration, mode: event.target.value as RationMode })}><option value="DAILY">На день</option><option value="WEEKLY">На неделю</option></select></label>
                  <label className={ui("field")}><span>Цель, ккал/сут</span><input className={ui("input", "highlight")} type="number" min="0" value={ration.targetEnergy} onChange={(event) => setRation({ ...ration, targetEnergy: Number(event.target.value) })} /></label>
                  <label className={ui("field")}><span>Допустимое превышение, %</span><input className={ui("input")} type="number" min="0" max="100" step="1" value={ration.tolerancePercent} onChange={(event) => setRation({ ...ration, tolerancePercent: Number(event.target.value) })} /><div className={ui("fieldHint")}>По умолчанию 10%. Недобор и превышение диапазона подсвечиваются красным.</div></label>
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
