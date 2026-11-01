import assert from "node:assert/strict";
import test from "node:test";
import { summarizeNutrients } from "./nutrient-summary";
import { requiredRationNutrients } from "@backend/domain/catalog/nutrient-conventions";

const zinc = { id: "shared", code: "Zn", name: "Цинк", unit: "мг", category: "Минералы" };
const item = (amount: number | null, nutrientId = "shared", grams = 100, enabled = true) => ({ enabled, grams, product: { baseQuantity: 100, nutrients: [{ nutrientId, amount, nutrient: zinc }] } });
const findZinc = (rows: ReturnType<typeof summarizeNutrients>) => rows.find(({ nutrient }) => nutrient.code === "Zn");

test("sums shared and private IDs by identity, not ID", () => {
  const row = findZinc(summarizeNutrients([item(1), item(2, "own", 200)], "DAILY", [zinc]))!;
  assert.equal(row.amount, 5);
  assert.equal(row.complete, true);
});

test("always shows spreadsheet headings, never the entire dictionary or absent targets", () => {
  const rows = summarizeNutrients([item(null)], "DAILY", [zinc], [{ nutrientId: zinc.id, nutrient: zinc, targetAmount: 2 }]);
  assert.equal(findZinc(rows), undefined);
  assert.deepEqual(new Set(rows.map(({ nutrient }) => nutrient.code)), new Set(requiredRationNutrients.map(({ code }) => code)));
  assert.ok(rows.every((row) => row.amount === 0 && !row.complete && row.missingItems === 1));
  assert.equal(findZinc(summarizeNutrients([item(0)], "DAILY", [zinc]))?.complete, true);
});

test("weekly totals exclude disabled and zero-weight positions and keep partial coverage", () => {
  const row = findZinc(summarizeNutrients([item(7), item(null), item(500, "disabled", 100, false), item(100, "zero", 0)], "WEEKLY", [zinc]))!;
  assert.equal(row.amount, 1);
  assert.equal(row.complete, false);
  assert.equal(row.missingItems, 1);
  assert.equal(findZinc(summarizeNutrients([item(7, "disabled", 100, false)], "DAILY", [zinc])), undefined);
});

test("does not mix units or invent entries from unused definitions", () => {
  const grams = { ...zinc, id: "grams", unit: "г" };
  const another = { enabled: true, grams: 100, product: { baseQuantity: 100, nutrients: [{ nutrientId: grams.id, nutrient: grams, amount: 2 }] } };
  const rows = summarizeNutrients([item(1), another], "DAILY", [zinc, grams]);
  assert.equal(rows.filter(({ nutrient }) => nutrient.code === "Zn").length, 2);
  assert.equal(rows.find(({ nutrient }) => nutrient.code === "Zn" && nutrient.unit === "г")?.amount, 2);
  assert.equal(summarizeNutrients([], "DAILY", [zinc, grams]).length, requiredRationNutrients.length);
});

test("reference-only vitamin forms are not summed or displayed", () => {
  const hidden = { ...zinc, code: "A_RE", isReferenceOnly: true };
  const product = { baseQuantity: 100, nutrients: [{ nutrientId: "hidden", nutrient: hidden, amount: 99 }] };
  const rows = summarizeNutrients([{ enabled: true, grams: 100, product }], "DAILY", [hidden]);
  assert.equal(rows.some(({ nutrient }) => nutrient.code === "A_RE"), false);
  assert.equal(rows.find(({ nutrient }) => nutrient.code === "A")?.amount, 0);
});

test("macro headings match the upper widgets without double counting", () => {
  const protein = { ...zinc, code: "CP", unit: "г" };
  const product = { baseQuantity: 100, calories: 100, protein: 10, fat: 2, carbs: 3, nutrients: [{ nutrientId: "protein", nutrient: protein, amount: 999 }] };
  const rows = summarizeNutrients([{ enabled: true, grams: 200, product }], "DAILY", []);
  assert.equal(rows.find(({ nutrient }) => nutrient.code === "CP")?.amount, 20);
  assert.equal(rows.find(({ nutrient }) => nutrient.code === "Energy")?.amount, 200);
});
