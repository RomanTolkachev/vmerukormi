"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { calculateRecipe, changeProductKind, recipeNutrientKey, type ProductDraft, type ProductKind, type RecipeIngredient, type Nutrition } from "@backend/domain/catalog/recipe";
import { requestJson } from "@/shared/api";
import { Button, Input, Select, Textarea } from "@/shared/ui/controls";
import { EntitySelect } from "@/shared/ui/entity-select";
import { RequiredMark } from "@/shared/ui/required-mark";
import { notify } from "@/shared/ui/notifications";
import { ui } from "@/shared/ui/styles";
import type { EditableProduct } from "../model/edit-product";
import styles from "./product-form.module.css";

type Preview = Nutrition & { recipeIngredients: RecipeIngredient[] };
export function ProductForm({ initial, onSaved, onDirtyChange, onBusyChange, ingredientOnly = false }: {
  initial: EditableProduct; onSaved: (product: EditableProduct) => void; onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void; ingredientOnly?: boolean;
}) {
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [operation, setOperation] = useState<"save" | "preview" | null>(null);
  const busy = operation !== null;
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [needsCalculation, setNeedsCalculation] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [ingredientGrams, setIngredientGrams] = useState(100);
  const [tagNames, setTagNames] = useState(initial.tagNames ?? {});
  const queryClient = useQueryClient();
  const recipe = draft.kind === "RECIPE";
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  function change(patch: Partial<ProductDraft>, composition = false) {
    setDraft(current => ({ ...current, ...patch }));
    onDirtyChange?.(true);
    if (composition) setNeedsCalculation(true);
  }
  function pending(value: boolean, action: "save" | "preview" = "save") { setOperation(value ? action : null); onBusyChange?.(value); }
  function setKind(kind: ProductKind) {
    if (draft.kind === "RECIPE" && kind !== "RECIPE" && !window.confirm("Ингредиенты и приготовление будут убраны, КБЖУ и нутриенты обнулены. История сохранится после нажатия «Сохранить». Продолжить?")) return;
    try { setDraft(changeProductKind(draft, kind)); setNeedsCalculation(false); onDirtyChange?.(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сменить тип"); }
  }
  async function recompute(candidate = draft) {
    if (busy) return false;
    let manual = true;
    try {
      const calculated = calculateRecipe(draft.recipeIngredients, draft.recipeYieldGrams);
      manual = (["calories", "protein", "fat", "carbs"] as const).some(key => Math.abs(draft[key] - calculated[key]) > 0.000001) || draft.nutrients.some(value => value.amount !== calculated.nutrients.find(item => item.nutrientId === value.nutrientId)?.amount);
    } catch { manual = true; }
    if (manual && !window.confirm("Пересчитать все КБЖУ и нутриенты? Ручные корректировки будут сброшены. Без ингредиентов значения станут нулевыми.")) return false;
    pending(true, "preview"); setError("");
    try {
      const preview = await requestJson<Preview>("/api/products/recipe-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: initial.id || undefined, isShared: initial.isShared, recipeIngredients: candidate.recipeIngredients.map(({ productId, grams }) => ({ productId, grams })), recipeYieldGrams: candidate.recipeYieldGrams }) });
      const extra = draft.nutrients.filter(value => !preview.nutrients.some(item => recipeNutrientKey(item.nutrient) === recipeNutrientKey(value.nutrient))).map(value => ({ ...value, amount: 0 }));
      setDraft({ ...candidate, ...preview, nutrients: [...preview.nutrients, ...extra] });
      setNeedsCalculation(false); onDirtyChange?.(true);
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось пересчитать состав"); return false; }
    finally { pending(false); }
  }
  async function addIngredient() {
    if (!ingredientId || ingredientGrams <= 0 || draft.recipeIngredients.some(value => value.productId === ingredientId)) { setError("Выберите новый ингредиент и положительное количество"); return; }
    const ingredients = [...draft.recipeIngredients, { productId: ingredientId, grams: ingredientGrams } as RecipeIngredient];
    const previousTotal = draft.recipeIngredients.reduce((total, value) => total + value.grams, 0);
    const yieldGrams = draft.recipeYieldGrams === null || draft.recipeYieldGrams === previousTotal ? previousTotal + ingredientGrams : draft.recipeYieldGrams;
    if (await recompute({ ...draft, recipeIngredients: ingredients, recipeYieldGrams: yieldGrams })) setIngredientId("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); event.stopPropagation();
    if (busy || needsCalculation) return;
    pending(true); setError("");
    try {
      const saved = await requestJson<EditableProduct>(initial.id ? `/api/products/${initial.id}` : "/api/products", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, expectedRevision: initial.id ? initial.revision : undefined, recipeIngredients: draft.recipeIngredients.map(value => ({ productId: value.productId, grams: value.grams, sourceRevision: value.snapshot.revision })) }),
      });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["workspace-products"] }), queryClient.invalidateQueries({ queryKey: ["workspace-recipes"] }), queryClient.invalidateQueries({ queryKey: ["entity-options", "products"] }), queryClient.invalidateQueries({ queryKey: ["entity-option", "products"] })]);
      onDirtyChange?.(false); notify.success(recipe ? "Рецепт сохранён" : "Продукт сохранён"); onSaved(saved);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сохранить"); }
    finally { pending(false); }
  }
  const numberField = (key: "baseQuantity" | "calories" | "protein" | "fat" | "carbs", label: string) => <label className={ui("field")}><span>{label}<RequiredMark /></span><Input type="number" min={key === "baseQuantity" ? "0.000001" : "0"} step="any" required value={draft[key]} onChange={event => change({ [key]: Number(event.target.value) })} /></label>;
  return <form className={styles.form} onSubmit={submit}>
    <fieldset disabled={busy || !initial.canEdit} className={styles.fields}>
      <section className={styles.section}>
        <div className={recipe ? undefined : styles.grid}>
          <label className={ui("field")}><span>Название<RequiredMark /></span><Input required maxLength={180} value={draft.name} onChange={event => change({ name: event.target.value })} /></label>
          {!recipe && <>
            <label className={ui("field")}><span>Тип<RequiredMark /></span><Select value={draft.kind} onChange={event => setKind(event.target.value as ProductKind)}><option value="PRODUCT">Продукт</option><option value="SUPPLEMENT">Добавка</option>{!ingredientOnly && <option value="RECIPE">Рецепт</option>}</Select></label>
            <EntitySelect entity="groups" label="Группа" value={draft.groupId ?? ""} filters={{ shared: String(initial.isShared) }} selectedOption={draft.groupId ? undefined : null} onChange={value => change({ groupId: value || null })} />
          </>}
          {!recipe && <>{numberField("baseQuantity", "Базовое количество")}<label className={ui("field")}><span>Единица базового количества</span><Input required value={draft.unit} onChange={event => change({ unit: event.target.value })} /></label></>}
        </div>
        <p className={styles.hint}>{initial.isShared ? "Общий каталог: запись видна всем пользователям." : "Личный каталог: запись доступна вам и администратору."}</p>
      </section>
      {recipe && <section className={styles.section}>
        <h2>Ингредиенты</h2>
        {draft.recipeIngredients.length ? <div className={styles.rows}>{draft.recipeIngredients.map((ingredient, index) => <div className={styles.row} key={ingredient.productId}>
          <div><strong>{ingredient.snapshot.name}</strong><small>Сохранённый состав · версия {ingredient.snapshot.revision}</small></div>
          <label className={ui("field")}><span>Количество, г</span><Input aria-label={`Количество ${ingredient.snapshot.name}, г`} type="number" min="0.000001" step="any" required value={ingredient.grams} onChange={event => change({ recipeIngredients: draft.recipeIngredients.map((value, position) => position === index ? { ...value, grams: Number(event.target.value) } : value) }, true)} /></label>
          <Button type="button" variant="danger" onClick={() => change({ recipeIngredients: draft.recipeIngredients.filter((_, position) => position !== index) }, true)}>Убрать</Button>
        </div>)}</div> : null}
        <div className={styles.grid}>
          <EntitySelect entity="products" label="Продукт или добавка" value={ingredientId} filters={{ shared: String(initial.isShared), ingredients: "true", parentProductId: initial.id }} initial={{ ingredientOnly: true }} onChange={setIngredientId} />
          <label className={ui("field")}><span>Добавляемое количество, г</span><Input type="number" min="0.000001" step="any" value={ingredientGrams} onChange={event => setIngredientGrams(Number(event.target.value))} /></label>
        </div>
        <Button type="button" loading={operation === "preview"} onClick={() => void addIngredient()} disabled={!ingredientId}>Добавить ингредиент</Button>
        <label className={ui("field")}><span>Масса готового блюда, г{draft.recipeIngredients.length > 0 && <RequiredMark />}</span><Input type="number" min="0.000001" step="any" required={draft.recipeIngredients.length > 0} value={draft.recipeYieldGrams ?? ""} onChange={event => change({ recipeYieldGrams: event.target.value ? Number(event.target.value) : null }, true)} /></label>
        {needsCalculation && <div role="status" className={styles.notice}><p>Состав изменён. Пересчитайте его перед сохранением; можно отменить изменения всей формы.</p><Button type="button" loading={operation === "preview"} onClick={() => void recompute()}>Пересчитать состав</Button></div>}
      </section>}
      <section className={styles.section}>
        <div className={styles.heading}><h2>Пищевая ценность на {draft.baseQuantity} {draft.unit}</h2>{recipe && <Button type="button" loading={operation === "preview"} onClick={() => void recompute()}>Сбросить</Button>}</div>
        <p className={styles.hint}>{recipe ? "Рассчитанные значения можно корректировать вручную. «Сбросить» берёт актуальный состав ингредиентов; без них значения обнуляются." : "Введите значения с упаковки или из проверенного справочника."}</p>
        <div className={styles.grid}>{numberField("calories", "Калорийность, ккал")}{numberField("protein", "Белки, г")}{numberField("fat", "Жиры, г")}{numberField("carbs", "Углеводы, г")}</div>
        <label className={ui("field")}><span>Поиск по нутриентам</span><Input type="search" placeholder="Название или код нутриента" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className={styles.rows}>{draft.nutrients.filter(value => `${value.nutrient.name} ${value.nutrient.code}`.toLowerCase().includes(search.toLowerCase())).map(value => <div key={value.nutrientId} className={styles.row}>
          <div><strong>{value.nutrient.name}</strong><small>{value.nutrient.category}{value.amount === null ? " · Нет полных данных" : ""}</small></div>
          <label className={ui("field")}><span>{value.nutrient.unit}</span><Input aria-label={value.nutrient.name} type="number" min="0" step="any" value={value.amount ?? ""} placeholder="Нет данных" onChange={event => change({ nutrients: draft.nutrients.map(item => item.nutrientId === value.nutrientId ? { ...item, amount: event.target.value === "" ? null : Number(event.target.value) } : item) })} /></label>
          <Button type="button" variant="danger" onClick={() => change({ nutrients: draft.nutrients.filter(item => item.nutrientId !== value.nutrientId) })}>Убрать</Button>
        </div>)}</div>
        {!draft.nutrients.length && <p className={styles.hint}>Нутриенты ещё не добавлены.</p>}
        <EntitySelect entity="nutrients" label="Добавить нутриент" value="" filters={{ shared: String(initial.isShared) }} onChange={(_, option) => { if (option && !draft.nutrients.some(value => value.nutrientId === option.value)) change({ nutrients: [...draft.nutrients, { nutrientId: option.value, amount: 0, nutrient: { id: option.value, name: option.label, code: String(option.data.code), category: String(option.data.category), unit: String(option.data.unit) } }] }); }} />
      </section>
      {recipe && <section className={styles.section}><h2>Приготовление</h2><label className={ui("field")}><span>Порядок приготовления</span><Textarea rows={6} value={draft.recipeInstructions} onChange={event => change({ recipeInstructions: event.target.value })} /></label><label className={ui("field")}><span>Примечания и условия применения</span><Textarea rows={3} value={draft.recipeNotes} onChange={event => change({ recipeNotes: event.target.value })} /></label></section>}
      <section className={styles.section}><h2>Меры и дозирование</h2><p className={styles.hint}>Без дополнительной меры количество в рационе вводится в граммах.</p>
        {draft.measures.map((measure, index) => <div className={styles.row} key={measure.id || `new-${index}`}><label className={ui("field")}><span>Название меры</span><Input required value={measure.name} onChange={event => change({ measures: draft.measures.map((value, position) => position === index ? { ...value, name: event.target.value } : value) })} /></label><label className={ui("field")}><span>1 мера, г</span><Input required type="number" min="0.000001" step="any" value={measure.grams} onChange={event => change({ measures: draft.measures.map((value, position) => position === index ? { ...value, grams: Number(event.target.value) } : value) })} /></label><Button type="button" variant="danger" onClick={() => change({ measures: draft.measures.filter((_, position) => position !== index) })}>Убрать</Button></div>)}
        <Button type="button" onClick={() => change({ measures: [...draft.measures, { id: "", name: "", grams: 1 }] })}>Добавить меру</Button>
      </section>
      {!recipe && <section className={styles.section}><h2>Теги и доступность</h2><div className={styles.tags}>{draft.tagIds.map(id => <Button type="button" key={id} onClick={() => change({ tagIds: draft.tagIds.filter(value => value !== id) })}>Убрать: {tagNames[id] ?? "тег"}</Button>)}</div><EntitySelect entity="tags" label="Добавить тег" value="" filters={{ shared: String(initial.isShared) }} onChange={(value, option) => { if (value && !draft.tagIds.includes(value)) { change({ tagIds: [...draft.tagIds, value] }); setTagNames(current => ({ ...current, [value]: option?.label ?? "Тег" })); } }} /><label><Input type="checkbox" checked={draft.archived} onChange={event => change({ archived: event.target.checked })} /> Архивный продукт</label></section>}
    </fieldset>
    {error && <p role="alert" className={ui("error")}>{error}</p>}
    {initial.canEdit && <div className={styles.footer}><span className={styles.hint}>{dirty ? "Есть несохранённые изменения" : "Изменения сохраняются одной версией"}</span><div className={ui("actions")}><Button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm("Отменить несохранённые изменения?")) { setDraft(initial); setNeedsCalculation(false); setError(""); onDirtyChange?.(false); } }}>Отменить изменения</Button><Button type="submit" variant="primary" loading={operation === "save"} disabled={busy || needsCalculation}>{operation === "save" ? "Сохраняем…" : "Сохранить"}</Button></div></div>}
  </form>;
}
