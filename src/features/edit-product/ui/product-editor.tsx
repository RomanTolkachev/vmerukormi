"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  addProductMeasure,
  addProductNutrient,
  createProductTag,
  deleteProductMeasure,
  deleteProductNutrient,
  updateProduct,
  updateProductMeasure,
  updateProductNutrient,
} from "../api/product-editor-api";
import type {
  EditableProduct,
  NutrientOption,
  ProductGroupOption,
  ProductKind,
  ProductMeasureValue,
  ProductTagOption,
} from "../model/edit-product";
import { ui } from "@/shared/ui/styles";

const measurePresets = [
  { name: "мг", grams: 0.001 },
  { name: "таблетка", grams: null },
  { name: "капсула", grams: null },
  { name: "капля", grams: null },
  { name: "мл", grams: null },
  { name: "мерная ложка", grams: null },
  { name: "саше", grams: null },
] as const;

function formatGrams(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
}

export function ProductEditor({
  initialProduct,
  nutrients,
  groups,
  tags: initialTags,
}: {
  initialProduct: EditableProduct;
  nutrients: NutrientOption[];
  groups: ProductGroupOption[];
  tags: ProductTagOption[];
}) {
  const [product, setProduct] = useState(initialProduct);
  const [values, setValues] = useState(initialProduct.nutrients);
  const [measures, setMeasures] = useState(initialProduct.measures);
  const [tags, setTags] = useState(initialTags);
  const [newTag, setNewTag] = useState("");
  const available = useMemo(
    () => nutrients.filter((nutrient) => !values.some((value) => value.nutrientId === nutrient.id)),
    [nutrients, values],
  );
  const [nutrientId, setNutrientId] = useState("");
  const [amount, setAmount] = useState("0");
  const [measureName, setMeasureName] = useState("мг");
  const [measureGrams, setMeasureGrams] = useState("0.001");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await updateProduct(product.id, {
        name: product.name,
        kind: product.kind,
        groupId: product.groupId,
        baseQuantity: product.baseQuantity,
        unit: product.unit,
        calories: product.calories,
        protein: product.protein,
        fat: product.fat,
        carbs: product.carbs,
        archived: product.archived,
        tagIds: product.tagIds,
      });
      setMessage("Параметры продукта сохранены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить продукт");
    } finally {
      setPending(false);
    }
  }

  async function addTag() {
    if (!newTag.trim()) return;
    setPending(true);
    setError("");
    try {
      const tag = await createProductTag(newTag, product.isShared);
      setTags((current) => current.some((item) => item.id === tag.id) ? current : [...current, tag].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      setProduct((current) => ({ ...current, tagIds: current.tagIds.includes(tag.id) ? current.tagIds : [...current.tagIds, tag.id] }));
      setNewTag("");
      setMessage("Тег добавлен. Сохраните продукт");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать тег");
    } finally {
      setPending(false);
    }
  }

  async function addNutrient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedId = nutrientId || available[0]?.id;
    if (!selectedId) return;
    setPending(true);
    setError("");
    try {
      const value = await addProductNutrient(product.id, selectedId, Number(amount));
      setValues((current) => [...current, value].sort((a, b) => a.nutrient.name.localeCompare(b.nutrient.name, "ru")));
      setNutrientId("");
      setAmount("0");
      setMessage("Нутриент добавлен");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось добавить нутриент");
    } finally {
      setPending(false);
    }
  }

  async function saveNutrient(nutrientValueId: string, nextAmount: number) {
    setError("");
    try {
      const updated = await updateProductNutrient(product.id, nutrientValueId, nextAmount);
      setValues((current) => current.map((value) => value.nutrientId === nutrientValueId ? updated : value));
      setMessage("Количество обновлено");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось обновить нутриент");
    }
  }

  async function removeNutrient(nutrientValueId: string) {
    setError("");
    try {
      await deleteProductNutrient(product.id, nutrientValueId);
      setValues((current) => current.filter((value) => value.nutrientId !== nutrientValueId));
      setMessage("Нутриент удалён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить нутриент");
    }
  }

  function selectMeasurePreset(name: string, grams: number | null) {
    setMeasureName(name);
    setMeasureGrams(grams === null ? "" : String(grams));
  }

  async function addMeasure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const grams = Number(measureGrams);
    if (!measureName.trim() || !Number.isFinite(grams) || grams <= 0) return;
    setPending(true);
    setError("");
    try {
      const measure = await addProductMeasure(product.id, measureName, grams);
      setMeasures((current) => [...current, measure].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      setMeasureName("");
      setMeasureGrams("");
      setMessage("Мера добавлена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось добавить меру");
    } finally {
      setPending(false);
    }
  }

  async function saveMeasure(measure: ProductMeasureValue) {
    if (!measure.name.trim() || !Number.isFinite(measure.grams) || measure.grams <= 0) return;
    setError("");
    try {
      const updated = await updateProductMeasure(product.id, measure.id, measure.name, measure.grams);
      setMeasures((current) => current.map((value) => value.id === measure.id ? updated : value));
      setMessage("Мера обновлена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось обновить меру");
    }
  }

  async function removeMeasure(measureId: string) {
    setError("");
    try {
      await deleteProductMeasure(product.id, measureId);
      setMeasures((current) => current.filter((value) => value.id !== measureId));
      setMessage("Мера удалена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить меру");
    }
  }

  return <div className={ui("pageLayout", "productEditorPage")}>
    <header className={ui("productEditorHeader")}>
      <div>
        <Link className={ui("backLink")} href="/products">← Все продукты</Link>
        <h1>{product.name}</h1>
        <div className={ui("meta")}>Пищевая ценность указана на {product.baseQuantity} {product.unit}</div>
      </div>
      <span className={ui("badge")}>{values.length} нутриентов</span>
    </header>

    {product.isShared && <p className={ui("meta")}>Общий каталог. {product.canEdit ? "Вы можете редактировать эту запись." : "Редактирование доступно администратору."}</p>}
    {product.source === "health-diet" && product.sourceExternalId && <a href={`https://health-diet.ru/base_of_food/sostav/${product.sourceExternalId}.php`} target="_blank" rel="noreferrer">Источник состава: health-diet.ru</a>}
    <fieldset disabled={!product.canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <div className={ui("productEditorGrid")}>
      <section className={ui("card", "productMainCard")}>
        <form onSubmit={saveProduct}>
          <div className={ui("cardHead")}><div><h2>Параметры и КБЖУ</h2><div className={ui("meta")}>Значения используются в расчётах рациона</div></div></div>
          <div className={ui("cardBody")}>
            <div className={ui("formGrid")}>
              <label className={ui("field", "full")}><span>Название</span><input className={ui("input")} value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} required /></label>
              <label className={ui("field")}><span>Тип</span><select className={ui("input")} value={product.kind} onChange={(event) => setProduct({ ...product, kind: event.target.value as ProductKind })}><option value="PRODUCT">Продукт</option><option value="SUPPLEMENT">Добавка</option><option value="RECIPE">Рецепт</option></select></label>
              <label className={ui("field")}><span>Группа</span><select className={ui("input")} value={product.groupId ?? ""} onChange={(event) => setProduct({ ...product, groupId: event.target.value || null })}><option value="">Без группы</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
              <label className={ui("field")}><span>Базовое количество</span><input className={ui("input")} type="number" min="0.01" step="0.01" value={product.baseQuantity} onChange={(event) => setProduct({ ...product, baseQuantity: Number(event.target.value) })} /></label>
              <label className={ui("field")}><span>Единица</span><input className={ui("input")} value={product.unit} onChange={(event) => setProduct({ ...product, unit: event.target.value })} /></label>
              <label className={ui("field")}><span>Калорийность, ккал</span><input className={ui("input", "highlight")} type="number" min="0" step="0.01" value={product.calories} onChange={(event) => setProduct({ ...product, calories: Number(event.target.value) })} /></label>
              <label className={ui("field")}><span>Белки, г</span><input className={ui("input")} type="number" min="0" step="0.01" value={product.protein} onChange={(event) => setProduct({ ...product, protein: Number(event.target.value) })} /></label>
              <label className={ui("field")}><span>Жиры, г</span><input className={ui("input")} type="number" min="0" step="0.01" value={product.fat} onChange={(event) => setProduct({ ...product, fat: Number(event.target.value) })} /></label>
              <label className={ui("field")}><span>Углеводы, г</span><input className={ui("input")} type="number" min="0" step="0.01" value={product.carbs} onChange={(event) => setProduct({ ...product, carbs: Number(event.target.value) })} /></label>
              <label className={ui("productArchive")}><input type="checkbox" checked={product.archived} onChange={(event) => setProduct({ ...product, archived: event.target.checked })} /> Архивный продукт</label>
              <div className={ui("field", "full")}>
                <span>Теги для поиска в каталоге</span>
                <div className={ui("productTagList")}>
                  {tags.map((tag) => <button className={ui("tagChip", product.tagIds.includes(tag.id) && "tagChipActive")} type="button" aria-pressed={product.tagIds.includes(tag.id)} key={tag.id} onClick={() => setProduct((current) => ({ ...current, tagIds: current.tagIds.includes(tag.id) ? current.tagIds.filter((id) => id !== tag.id) : [...current.tagIds, tag.id] }))}>{tag.name}</button>)}
                  {!tags.length && <small className={ui("fieldHint")}>Тегов пока нет — создайте первый.</small>}
                </div>
                <div className={ui("inlineTagCreate")}>
                  <input className={ui("input")} value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Например, источник белка" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addTag(); } }} />
                  <button className={ui("secondary")} type="button" disabled={pending || !newTag.trim()} onClick={() => void addTag()}>Создать тег</button>
                </div>
              </div>
            </div>
            <div className={ui("actions")}><button className={ui("primary")} disabled={pending}>Сохранить продукт</button></div>
          </div>
        </form>
      </section>

      <div className={ui("productNutrientColumn")}>
        <section className={ui("card")}>
          <form onSubmit={addMeasure}>
            <div className={ui("cardHead")}><div><h2>Меры и дозирование</h2><div className={ui("meta")}>Для таблеток, капель и малых доз</div></div></div>
            <div className={ui("cardBody", "productMeasureBody")}>
              <div className={ui("productTagList")}>{measurePresets.map((preset) => <button className={ui("tagChip", measureName === preset.name && "tagChipActive")} type="button" key={preset.name} onClick={() => selectMeasurePreset(preset.name, preset.grams)}>{preset.name}</button>)}</div>
              <div className={ui("measureCreateGrid")}>
                <label className={ui("field")}><span>Название меры</span><input className={ui("input")} value={measureName} onChange={(event) => setMeasureName(event.target.value)} placeholder="Например, таблетка" required /></label>
                <label className={ui("field")}><span>Вес одной меры, г</span><input className={ui("input")} type="number" min="0.000001" step="any" value={measureGrams} onChange={(event) => setMeasureGrams(event.target.value)} placeholder="Например, 0.5" required /></label>
                <button className={ui("secondary")} disabled={pending}>Добавить меру</button>
              </div>
              <div className={ui("fieldHint")}>Для миллиграмма уже подставлено 0,001 г. Вес таблетки, капли, капсулы или ложки зависит от конкретного препарата — возьмите его с упаковки или измерьте.</div>
              {measures.length ? <div className={ui("measureValueList")}>{measures.map((measure) => <div className={ui("measureValueRow")} key={measure.id}>
                <input className={ui("input")} value={measure.name} aria-label="Название меры" onChange={(event) => setMeasures((current) => current.map((value) => value.id === measure.id ? { ...value, name: event.target.value } : value))} onBlur={() => void saveMeasure(measure)} />
                <label><span>1 мера =</span><input className={ui("input")} type="number" min="0.000001" step="any" value={measure.grams} aria-label={`Вес меры ${measure.name} в граммах`} onChange={(event) => setMeasures((current) => current.map((value) => value.id === measure.id ? { ...value, grams: Number(event.target.value) } : value))} onBlur={() => void saveMeasure(measure)} /><span>г</span></label>
                <small>{formatGrams(measure.grams)} г</small>
                <button className={ui("danger")} type="button" onClick={() => void removeMeasure(measure.id)}>Удалить</button>
              </div>)}</div> : <div className={ui("empty")}>Дополнительных мер пока нет</div>}
            </div>
          </form>
        </section>

        <section className={ui("card")}>
          <form onSubmit={addNutrient}>
            <div className={ui("cardHead")}><h2>Добавить нутриент</h2></div>
            <div className={ui("cardBody", "productNutrientForm")}>
              {available.length ? <>
                <label className={ui("field")}><span>Нутриент</span><select className={ui("input")} value={nutrientId || available[0]?.id} onChange={(event) => setNutrientId(event.target.value)}>{available.map((nutrient) => <option value={nutrient.id} key={nutrient.id}>{nutrient.code} — {nutrient.name} ({nutrient.unit})</option>)}</select></label>
                <label className={ui("field")}><span>Количество</span><input className={ui("input")} type="number" min="0" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
                <button className={ui("secondary")} disabled={pending}>Добавить</button>
              </> : <div className={ui("empty")}>Все нутриенты уже добавлены</div>}
            </div>
          </form>
        </section>

        <section className={ui("card", "nutrientValuesCard")}>
          <div className={ui("cardHead")}><div><h2>Нутриентный состав</h2><div className={ui("meta")}>На {product.baseQuantity} {product.unit}</div></div></div>
          <div className={ui("cardBody", "nutrientValuesBody")}>
            {values.length ? <div className={ui("nutrientValueList")}>{values.map((value) => <div className={ui("nutrientValueRow")} key={value.nutrientId}>
              <div><b>{value.nutrient.code}</b><span>{value.nutrient.name}</span><small>{value.nutrient.category}</small></div>
              <label><input className={ui("input")} type="number" min="0" step="any" defaultValue={value.amount ?? 0} onBlur={(event) => void saveNutrient(value.nutrientId, Number(event.target.value))} /><span>{value.nutrient.unit}</span></label>
              <button className={ui("danger")} type="button" onClick={() => void removeNutrient(value.nutrientId)}>Удалить</button>
            </div>)}</div> : <div className={ui("empty")}>Нутриенты пока не добавлены</div>}
          </div>
        </section>
      </div>
    </div>
    </fieldset>
    {message && <div className={ui("productEditorMessage")}>{message}</div>}
    {error && <div className={ui("error")}>{error}</div>}
  </div>;
}
