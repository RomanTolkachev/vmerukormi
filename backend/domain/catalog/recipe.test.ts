import assert from "node:assert/strict";
import test from "node:test";
import { calculateRecipe, changeProductKind, emptyProduct, type RecipeIngredient } from "./recipe";

const nutrient = { id: "fiber", code: "CFi", name: "Сырая клетчатка", category: "Прочее", unit: "мг" };
const ingredient: RecipeIngredient = { productId: "potato", grams: 200, snapshot: { id: "potato", name: "Картофель", kind: "PRODUCT", revision: 1, baseQuantity: 100, unit: "г", calories: 80, protein: 2, fat: 0.1, carbs: 17, nutrients: [{ nutrientId: nutrient.id, amount: 2000, nutrient }] } };

test("recipe calculation uses ingredient quantities, finished yield and source mass units", () => {
  const supplement: RecipeIngredient = { ...ingredient, productId: "supplement", grams: 0.5, snapshot: { ...ingredient.snapshot, id: "supplement", kind: "SUPPLEMENT", baseQuantity: 1000, unit: "мг", calories: 10, protein: 1, fat: 0, carbs: 0 } };
  const result = calculateRecipe([ingredient, supplement], 250);
  assert.deepEqual([result.calories, result.protein, result.fat, result.carbs], [66, 1.8, 0.08000000000000002, 13.600000000000001]);
  assert.equal(result.nutrients[0].amount, 2000);
  assert.equal(result.nutrients[0].nutrient.unit, "мг");
});

test("missing nutrient amounts are not silently treated as a confirmed zero", () => {
  const result = calculateRecipe([ingredient, { ...ingredient, productId: "unknown", snapshot: { ...ingredient.snapshot, nutrients: [] } }], 400);
  assert.equal(result.nutrients[0].amount, null);
});

test("legacy private and shared nutrient IDs represent the same nutrient, not missing values", () => {
  const alternative = { ...nutrient, id: "shared-fiber" };
  const result = calculateRecipe([ingredient, { ...ingredient, productId: "other", snapshot: { ...ingredient.snapshot, nutrients: [{ nutrientId: alternative.id, nutrient: alternative, amount: 1000 }] } }], 400);
  assert.equal(result.nutrients.length, 1);
  assert.equal(result.nutrients[0].amount, 1500);
});

test("reset without ingredients returns zeros, invalid ingredients never partially calculate", () => {
  assert.deepEqual(calculateRecipe([], null), { calories: 0, protein: 0, fat: 0, carbs: 0, nutrients: [] });
  assert.throws(() => calculateRecipe([ingredient], 0), /массу/);
  assert.throws(() => calculateRecipe([{ ...ingredient, snapshot: { ...ingredient.snapshot, kind: "RECIPE" } }], 100), /Вложенные/);
  assert.throws(() => calculateRecipe([{ ...ingredient, snapshot: { ...ingredient.snapshot, unit: "шт" } }], 100), /масса/);
});

test("type changes clear departing recipes but preserve primitive nutrition and normalize recipe basis", () => {
  const primitive = { ...emptyProduct(), baseQuantity: 50, calories: 40, protein: 1, nutrients: ingredient.snapshot.nutrients };
  assert.equal(changeProductKind(primitive, "SUPPLEMENT").protein, 1);
  const recipe = changeProductKind(primitive, "RECIPE");
  assert.equal(recipe.protein, 2);
  assert.equal(recipe.nutrients[0].amount, 4000);
  const result = changeProductKind({ ...recipe, recipeIngredients: [ingredient], recipeInstructions: "Cook", recipeYieldGrams: 200 }, "PRODUCT");
  assert.equal(result.protein, 0);
  assert.equal(result.nutrients[0].amount, 0);
  assert.equal(result.recipeIngredients.length, 0);
  assert.equal(result.recipeInstructions, "");
  assert.equal(result.recipeYieldGrams, null);
});
