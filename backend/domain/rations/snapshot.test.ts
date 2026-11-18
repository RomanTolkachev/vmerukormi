import assert from "node:assert/strict";
import test from "node:test";
import { createProductSnapshot, applyRationSnapshot, readProductSnapshot } from "./snapshot";

test("ration snapshots preserve composition and measures after source edits or deletion", () => {
  const original = { id: "product", name: "Продукт", baseQuantity: 100, unit: "г", calories: 100, protein: 10, fat: 2, carbs: 5,
    measures: [{ id: "measure", name: "Порция", grams: 20 }], nutrients: [{ nutrientId: "zinc", amount: 0.004, nutrient: { code: "Zn", name: "Цинк", unit: "мг", category: "Минералы" } }] };
  const snapshot = createProductSnapshot(original, original.measures[0]);
  const item = applyRationSnapshot({ grams: 40, productSnapshot: snapshot, product: { ...original, deletedAt: new Date(), calories: 999, name: "Изменён", nutrients: [] }, measure: { ...original.measures[0], grams: 500 } });
  assert.equal(item.product.calories, 100);
  assert.equal(item.product.name, "Продукт");
  assert.equal(item.product.nutrients.length, 1);
  assert.equal(item.measure.grams, 20);
  assert.ok(item.product.deletedAt);
  assert.equal(item.grams, 40);
  assert.equal(readProductSnapshot({ version: 99 }), null);
});
