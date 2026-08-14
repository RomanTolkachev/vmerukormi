"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  addProductNutrient,
  createProductTag,
  deleteProductNutrient,
  updateProduct,
  updateProductNutrient,
} from "../api/product-editor-api";
import type {
  EditableProduct,
  NutrientOption,
  ProductGroupOption,
  ProductKind,
  ProductTagOption,
} from "../model/types";
import { ui } from "@/shared/ui/styles/ui";

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
  const [tags, setTags] = useState(initialTags);
  const [newTag, setNewTag] = useState("");
  const available = useMemo(
    () => nutrients.filter((nutrient) => !values.some((value) => value.nutrientId === nutrient.id)),
    [nutrients, values],
  );
  const [nutrientId, setNutrientId] = useState("");
  const [amount, setAmount] = useState("0");
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
      const tag = await createProductTag(newTag);
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

  return <div className={ui("pageLayout", "productEditorPage")}>
    <header className={ui("productEditorHeader")}>
      <div>
        <Link className={ui("backLink")} href="/products">← Все продукты</Link>
        <h1>{product.name}</h1>
        <div className={ui("meta")}>Пищевая ценность указана на {product.baseQuantity} {product.unit}</div>
      </div>
      <span className={ui("badge")}>{values.length} нутриентов</span>
    </header>

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
                <span>Теги для подбора рациона</span>
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
    {message && <div className={ui("productEditorMessage")}>{message}</div>}
    {error && <div className={ui("error")}>{error}</div>}
  </div>;
}
