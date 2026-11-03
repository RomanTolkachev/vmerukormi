"use client";

import { RequiredMark } from "@/shared/ui/required-mark";

import { EntitySelect } from "@/features/create-entity";
import { ui } from "@/shared/ui/styles";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addRationItem,
  deleteRation,
  deleteRationItem,
  updateRationItem,
} from "@/features/rations";
import type {
  RationEditorValue,
  RationItem,
  RationProduct,
} from "@/entities/ration";
import { summarizeNutrients, targetStatus, targetStatusClass, targetStatusLabel } from "@/entities/ration";
import { AnchorButton, Button, Input, Select } from "@/shared/ui/controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Modal } from "@/shared/ui/modal";
import { RationDetailsDialog } from "@/features/edit-ration";

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
  products: initialProducts,
  nutrients,
}: {
  initialRation: RationEditorValue;
  products: RationProduct[];
  nutrients: { id: string; code: string; name: string; category: string; unit: string }[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [ration, setRation] = useState(initialRation);
  const [productId, setProductId] = useState("");
  const [measureId, setMeasureId] = useState("");
  const [productFocus, setProductFocus] = useState<ProductFocus | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [day, setDay] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [nutrientsDialogOpen, setNutrientsDialogOpen] = useState(false);
  const [itemPending, setItemPending] = useState(false);
  const [itemError, setItemError] = useState("");
  const [itemDirty, setItemDirty] = useState(false);
  const availableProducts = useMemo(() => [...products]
    .sort((first, second) => productFocus ? scoreProduct(second, productFocus) - scoreProduct(first, productFocus) || first.name.localeCompare(second.name, "ru") : first.name.localeCompare(second.name, "ru")), [productFocus, products]);
  const selectedProduct = products.find((product) => product.id === productId);
  const selectedMeasure = selectedProduct?.measures.find((measure) => measure.id === measureId);

  function openProductPicker(focus: ProductFocus | null = null) {
    setProductFocus(focus);
    const rankedProducts = focus ? [...products].sort((first, second) => scoreProduct(second, focus) - scoreProduct(first, focus) || first.name.localeCompare(second.name, "ru")) : [];
    setProductId(rankedProducts[0]?.id ?? "");
    setMeasureId("");
    setQuantity("100");
    setDay("1");
    setItemError("");
    setItemDirty(false);
    setProductDialogOpen(true);
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

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId || itemPending) return;
    setItemPending(true);
    setItemError("");
    try {
      const item = await addRationItem(ration.id, {
        productId,
        measureId: measureId || null,
        quantity: Number(quantity),
        day: Number(day),
      });
      setRation((current) => ({ ...current, items: [...current.items, item] }));
      setMessage("Продукт добавлен");
      setProductDialogOpen(false);
    } catch (caught) {
      setItemError(caught instanceof Error ? caught.message : "Не удалось добавить продукт");
    } finally {
      setItemPending(false);
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
            {ration.pet ? ` · ${ration.pet.name}` : " · Без питомца"}
          </div>
        </div>
        <div className={ui("rationEditorActions")}>
          <Button type="button" onClick={() => setDetailsDialogOpen(true)}>Параметры рациона</Button>
          <AnchorButton href={`/api/rations/${ration.id}/export`}>Выгрузить в Excel</AnchorButton>
          <Button className={ui("danger")} type="button" onClick={() => void removeRation()}>Удалить рацион</Button>
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
        <Button type="button" className={ui("rationMetric", proteinComparison === "low" && "rationMetricAction", targetStatusClass(proteinComparison))} onClick={() => proteinComparison === "low" && openProductPicker({ kind: "macro", code: "protein", name: "Белок", unit: "г" })}><span>Белок</span><strong>{formatNumber(totals.protein)} г</strong><small>{ration.calculation ? `норма ${formatNumber(ration.calculation.protein)} г · ${targetStatusLabel(proteinComparison, ration.tolerancePercent)}` : "в сутки"}</small></Button>
        <Button type="button" className={ui("rationMetric", fatComparison === "low" && "rationMetricAction", targetStatusClass(fatComparison))} onClick={() => fatComparison === "low" && openProductPicker({ kind: "macro", code: "fat", name: "Жир", unit: "г" })}><span>Жир</span><strong>{formatNumber(totals.fat)} г</strong><small>{ration.calculation ? `норма ${formatNumber(ration.calculation.fat)} г · ${targetStatusLabel(fatComparison, ration.tolerancePercent)}` : "в сутки"}</small></Button>
        <Button type="button" className={ui("rationMetric", carbsComparison === "low" && "rationMetricAction", targetStatusClass(carbsComparison))} onClick={() => carbsComparison === "low" && openProductPicker({ kind: "macro", code: "carbs", name: "Углеводы", unit: "г" })}><span>Углеводы</span><strong>{formatNumber(totals.carbs)} г</strong><small>{ration.calculation ? `норма ${formatNumber(ration.calculation.carbs)} г · ${targetStatusLabel(carbsComparison, ration.tolerancePercent)}` : "в сутки"}</small></Button>
        <div className={ui("rationMetric")}><span>Влага</span><strong>{formatNumber(moisture)} г</strong><small>{moistureSummary?.complete ? "в сутки" : "в сутки · неполные данные"}</small></div>
      </section>

      <div className={ui("rationEditorGrid")}>
        <div className={ui("rationEditorMain")}>
          <div className={ui("cardHead", "rationCompositionHead")}>
            <div><h2>Состав рациона</h2><div className={ui("meta")}>Количество пересчитывается сразу после изменения</div></div>
            <div className={ui("rationCompositionActions")}>
              <Button type="button" className={ui("secondary")} onClick={() => setNutrientsDialogOpen(true)}>Нутриенты</Button>
              <Button type="button" className={ui("primary")} onClick={() => openProductPicker()}>Добавить продукт</Button>
            </div>
          </div>
          <section className={ui("card")} aria-label="Продукты рациона">
            <div className={ui("cardBody")}>
              {message && <div className={ui("rationMessage")} role="status">{message}</div>}
              {error && <div className={ui("error")} role="alert">{error}</div>}
              {ration.items.length ? (
                <div className={ui("rationItemsWrap")}>
                  <table className={ui("rationItemsTable")}>
                    <thead><tr><th>Вкл.</th><th>Продукт</th>{ration.mode === "WEEKLY" && <th>День</th>}<th>Мера</th><th>Количество</th><th>Граммы</th><th>Энергия</th><th /></tr></thead>
                    <tbody>
                      {ration.items.map((item) => {
                        const value = itemValues(item);
                        return (
                          <tr key={item.id} className={ui(!item.enabled && "rationItemDisabled")}>
                            <td><Input aria-label={`Включить ${item.product.name}`} type="checkbox" checked={item.enabled} onChange={(event) => void patchItem(item.id, { enabled: event.target.checked })} /></td>
                            <td>
                              <div className={ui("rationProductCell")}>
                                <b>{item.product.name}</b>
                                <Link className={ui("rationProductLink")} href={`/products/${item.product.id}`} target="_blank" rel="noopener noreferrer">Смотреть ↗</Link>
                              </div>
                              <small>{formatNumber(value.protein)} Б · {formatNumber(value.fat)} Ж · {formatNumber(value.carbs)} У</small>
                            </td>
                            {ration.mode === "WEEKLY" && <td><Select className={ui("input", "compactInput")} aria-label={`День для ${item.product.name}`} value={item.day} onChange={(event) => void patchItem(item.id, { day: Number(event.target.value) })}>{days.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</Select></td>}
                            <td><Select className={ui("input", "compactInput")} aria-label={`Мера для ${item.product.name}`} value={item.measureId ?? ""} onChange={(event) => void patchItem(item.id, { measureId: event.target.value || null })}><option value="">Граммы</option>{item.product.measures.map((measure) => <option value={measure.id} key={measure.id}>{measure.name}</option>)}</Select></td>
                            <td><Input className={ui("input", "compactInput", "quantityInput")} aria-label={`Количество ${item.product.name}`} type="number" min="0.000001" step="any" defaultValue={item.quantity} onBlur={(event) => void patchItem(item.id, { quantity: Number(event.target.value) })} /></td>
                            <td>{formatNumber(item.grams)} г</td>
                            <td><b>{formatNumber(value.calories, 0)}</b> ккал</td>
                            <td><Button className={ui("danger")} type="button" onClick={() => void removeItem(item.id)}>Удалить</Button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className={ui("empty")}>Добавьте первый продукт в рацион</div>}
            </div>
          </section>

        </div>
      </div>
      {detailsDialogOpen && <RationDetailsDialog ration={ration} onClose={() => setDetailsDialogOpen(false)} onSaved={saved => {
        setRation(current => ({ ...current, ...saved, items: saved.mode === "DAILY" ? current.items.map(item => ({ ...item, day: 1 })) : current.items }));
        setMessage("Параметры рациона сохранены");
        setError("");
      }} />}
      <Modal isOpen={nutrientsDialogOpen} onClose={() => setNutrientsDialogOpen(false)} title="Нутриенты рациона" showCloseButton>
        <h2 className={ui("formDialogHeading")}>Нутриенты рациона</h2>
        <p className={ui("meta")}>Среднее значение в сутки по включённым продуктам</p>
        <p className={ui("fieldHint")}>Показатели выбранных продуктов и обязательные показатели калькулятора. Если данных нет, показан 0 — это не подтверждённое отсутствие нутриента.</p>
        {nutrientSummary.length ? <div className={ui("nutrientSummaryGrid", "nutrientDialogGrid")}>{nutrientSummary.map(({ nutrient, amount, target, complete, missingItems }) => {
          const status = target && complete ? targetStatus(amount, target.targetAmount, ration.tolerancePercent) : null;
          return <div className={ui("nutrientSummaryCard", status && targetStatusClass(status))} key={`${nutrient.code}|${nutrient.unit}`}><span>{nutrient.name}</span><b>{target ? `${formatNumber(amount)} / ${formatNumber(target.targetAmount)}` : formatNumber(amount)} {nutrient.unit}</b><small>{!complete ? (missingItems ? `Нет данных у ${missingItems} позиций` : "Нет данных") : (status ? targetStatusLabel(status, ration.tolerancePercent) : "в сутки")}</small></div>;
        })}</div> : <div className={ui("empty")}>Нутриенты пока не заполнены</div>}
        <div className={ui("actions")}><Button type="button" className={ui("secondary")} onClick={() => setNutrientsDialogOpen(false)}>Закрыть</Button></div>
      </Modal>
      {productDialogOpen && <FormDialog title="Добавить продукт в рацион" onClose={() => setProductDialogOpen(false)} dirty={itemDirty} busy={itemPending}>
        <form onSubmit={addItem}>
          <div className={ui("formGrid", "single")}>
            {productFocus && <div className={ui("productFocus")}><span>Сортировка по содержанию на 100 ккал</span><b>{productFocus.name}</b><Button type="button" disabled={itemPending} onClick={() => setProductFocus(null)}>Сбросить</Button></div>}
            <EntitySelect entity="products" label="Продукт" value={productId} disabled={itemPending} required onChange={(value, option) => {
              if (option) setProducts(current => current.some(product => product.id === value) ? current : [...current, { ...option.data, measures: option.data.measures ?? [], nutrients: option.data.nutrients ?? [], tags: [] } as unknown as RationProduct]);
              setProductId(value);
              setMeasureId("");
              setItemDirty(true);
            }} />
            {productFocus && <label className={ui("field")}><span>Рейтинг по выбранному нутриенту<RequiredMark /></span><Select className={ui("input")} required value={productId} disabled={itemPending} onChange={event => { setProductId(event.target.value); setMeasureId(""); setItemDirty(true); }}><option value="">Выберите продукт</option>{availableProducts.map(product => <option key={product.id} value={product.id}>{product.name} · {formatNumber(scoreProduct(product, productFocus), 2)} {productFocus.unit}/100 ккал</option>)}</Select></label>}
            <label className={ui("field")}><span>Мера</span><Select className={ui("input")} value={measureId} disabled={itemPending || !selectedProduct} onChange={(event) => { setMeasureId(event.target.value); setItemDirty(true); }}><option value="">Граммы</option>{selectedProduct?.measures.map((measure) => <option value={measure.id} key={measure.id}>{measure.name} ({measure.grams} г)</option>)}</Select></label>
            <label className={ui("field")}><span>Количество{selectedMeasure ? `, ${selectedMeasure.name}` : ", г"}</span><Input className={ui("input")} type="number" min="0.000001" step="any" value={quantity} disabled={itemPending} onChange={(event) => { setQuantity(event.target.value); setItemDirty(true); }} required />{selectedMeasure && <div className={ui("fieldHint")}>{formatNumber(Number(quantity) * selectedMeasure.grams)} г продукта</div>}</label>
            {ration.mode === "WEEKLY" && <label className={ui("field")}><span>День<RequiredMark /></span><Select className={ui("input")} required value={day} disabled={itemPending} onChange={(event) => { setDay(event.target.value); setItemDirty(true); }}>{days.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</Select></label>}
          </div>
          {itemError && <div className={ui("error")} role="alert">{itemError}</div>}
          <div className={ui("actions")}><Button type="submit" className={ui("primary")} disabled={itemPending || !productId}>{itemPending ? "Добавляем…" : "Добавить в рацион"}</Button></div>
        </form>
      </FormDialog>}
    </div>
  );
}
