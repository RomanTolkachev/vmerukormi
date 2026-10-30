import assert from "node:assert/strict";
import test from "node:test";
import { summarizeNutrients } from "./nutrient-summary";

const zinc = { id: "shared", code: "Zn", name: "Цинк", unit: "мг", category: "Минералы" };
const item = (amount: number | null, nutrientId = "shared", grams = 100, enabled = true) => ({ enabled, grams, product: { baseQuantity: 100, nutrients: [{ nutrientId, amount, nutrient: zinc }] } });

test("sums shared and private nutrient IDs by identity, not ID", () => {
  const [row] = summarizeNutrients([item(1), item(2, "own", 200)], "DAILY", [zinc]);
  assert.equal(row.amount, 5);
  assert.equal(row.complete, true);
});

test("shows missing headings as zero without claiming complete data", () => {
  const [row] = summarizeNutrients([item(null)], "DAILY", [zinc]);
  assert.equal(row.amount, 0);
  assert.equal(row.missingItems, 1);
  assert.equal(row.complete, false);
  assert.equal(summarizeNutrients([item(0)], "DAILY", [zinc])[0].complete, true);
});

test("weekly totals ignore disabled positions, distinguish partial coverage and units", () => {
  const [row] = summarizeNutrients([item(7), item(null), item(500, "disabled", 100, false)], "WEEKLY", [zinc]);
  assert.equal(row.amount, 1);
  assert.equal(row.complete, false);
  const rows = summarizeNutrients([item(1)], "DAILY", [zinc, { ...zinc, id: "grams", unit: "г" }]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((value) => value.nutrient.unit === "г")?.amount, 0);
});

test("includes nutrients found only in products or calculation targets", () => {
  const rows = summarizeNutrients([item(1)], "DAILY", [], [{ nutrientId: "water", targetAmount: 10, nutrient: { ...zinc, code: "MO", unit: "г" } }]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((value) => value.nutrient.code === "MO")?.amount, 0);
});
