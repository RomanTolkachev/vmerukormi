import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extractHtml, parseRows, validateProduct } from "./parser.mjs";
import { generateMigration } from "./generate.mjs";

const snapshot = JSON.parse(readFileSync(new URL("./snapshot.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));
const product = snapshot.products.find((entry) => entry.id === "19914");

test("parses the supplied buckwheat source, not human daily allowances", () => {
  const values = new Map(validateProduct(product, manifest).map((value) => [value.code, value]));
  assert.equal(values.get("Energy").amount, 343);
  assert.equal(values.get("MO").amount, 9.8);
  assert.equal(values.get("Cu").amount, 1.1);
  assert.equal(values.get("Cu").unit, "мг");
  assert.equal(values.get("O3").amount, 78);
  assert.equal(values.has("Tau"), false);
  assert.equal(values.has("CFi"), false);
  assert.equal(values.get("Fiber").amount, 10);
});

test("all selected products have complete numeric tables and stable identities", () => {
  for (const entry of snapshot.products) assert.ok(validateProduct(entry, manifest).length >= 20);
  const result = generateMigration(snapshot, manifest);
  assert.equal(result.report.products, 24);
  assert.equal(result.report.values, 1555);
  assert.equal(result.report.nutrients, 139);
  assert.equal(result.sql, readFileSync(new URL("../../migrations/20261030091000_health_diet_catalog/migration.sql", import.meta.url), "utf8"));
  assert.equal(generateMigration({ ...snapshot, products: [...snapshot.products].reverse() }, manifest).sql, result.sql);
});

test("keeps A equivalents, retinol and D forms separate from legacy IU norms", () => {
  const values = validateProduct(snapshot.products.find((entry) => entry.id === "17552"), manifest);
  assert.equal(values.find((value) => value.code === "A_RE").unit, "мкг");
  assert.equal(values.find((value) => value.code === "Retinol").unit, "мг");
  assert.equal(values.find((value) => value.code === "D3_MCG").unit, "мкг");
  assert.equal(values.some((value) => value.code === "A" || value.code === "D3"), false);
});

test("HTML parser selects the first quantity cell and decodes decimal commas", () => {
  const html = '<h1>Калорийность Продукт. Химический состав</h1><table><tr><th>Нутриент</th><th>Количество</th><th>Норма</th></tr>' +
    [["Калорийность", "100 ккал"], ["Белки", "3,5&nbsp;г"], ["Жиры", "0 г"], ["Вода", "80 г"], ["Цинк, Zn", "1 мг"]].map(([name, amount]) => `<tr><td><span>${name}</span></td><td>${amount}</td><td>9999 мг</td></tr>`).join("") + '</table>';
  const parsed = parseRows(extractHtml(html).rows);
  assert.equal(parsed.find((value) => value.code === "CP").amount, 3.5);
  assert.equal(parsed.find((value) => value.code === "Zn").amount, 1);
  assert.equal(parsed.find((value) => value.code === "CFa").amount, 0);
});

test("rejects incomplete fetches, recipes, unapproved entries, duplicates and unexpected units", () => {
  assert.throws(() => extractHtml("<h1>Рецепт Лазанья</h1>"));
  assert.throws(() => extractHtml("<h1>Калорийность Продукт</h1>"));
  assert.throws(() => validateProduct({ ...product, name: "Виноград" }, manifest));
  assert.throws(() => validateProduct({ ...product, url: "https://health-diet.ru/table_calorie_users/1/" }, manifest));
  assert.throws(() => parseRows([...product.rows, ["Белки", "5 г"]]));
  assert.throws(() => parseRows([...product.rows, ["Тест", "5 литров"]]));
  assert.throws(() => generateMigration({ ...snapshot, products: snapshot.products.slice(1) }, manifest));
});

test("absent values remain absent, explicit zero remains known zero", () => {
  const values = parseRows([...product.rows, ["Тест", "~"], ["Ноль", "0 мг"]]);
  assert.equal(values.some((value) => value.name === "Тест"), false);
  assert.equal(values.find((value) => value.name === "Ноль").amount, 0);
});
