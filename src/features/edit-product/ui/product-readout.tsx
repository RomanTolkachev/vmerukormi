import type { ProductDraft } from "@backend/domain/catalog/recipe";
import styles from "./product-form.module.css";

export function ProductReadout({ product, nutrients = false }: { product: ProductDraft; nutrients?: boolean }) {
  const format = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
  return <article className={styles.readout}>
    <h2>{product.name}</h2>
    <p>{product.kind === "RECIPE" ? "Рецепт" : product.kind === "SUPPLEMENT" ? "Добавка" : "Продукт"} · состав на {product.baseQuantity} {product.unit}</p>
    <p>{format(product.calories)} ккал · Белки {format(product.protein)} г · Жиры {format(product.fat)} г · Углеводы {format(product.carbs)} г</p>
    {product.kind === "RECIPE" && <><p>Масса готового блюда: {product.recipeYieldGrams ? `${format(product.recipeYieldGrams)} г` : "не указана"}</p><h3>Ингредиенты</h3>{product.recipeIngredients.length ? <ul>{product.recipeIngredients.map(ingredient => <li key={ingredient.productId}>{ingredient.snapshot.name} — {format(ingredient.grams)} г</li>)}</ul> : <p>Ручной состав: ингредиенты не указаны.</p>}<h3>Приготовление</h3><pre>{product.recipeInstructions || "Порядок приготовления не заполнен."}</pre>{product.recipeNotes && <pre>{product.recipeNotes}</pre>}</>}
    {nutrients && <><h3>Нутриенты</h3><ul>{product.nutrients.map(value => <li key={value.nutrientId}>{value.nutrient.name}: {value.amount === null ? "нет данных" : `${format(value.amount)} ${value.nutrient.unit}`}</li>)}</ul><h3>Меры</h3><ul>{product.measures.map(measure => <li key={measure.id}>{measure.name}: {format(measure.grams)} г</li>)}</ul></>}
  </article>;
}
