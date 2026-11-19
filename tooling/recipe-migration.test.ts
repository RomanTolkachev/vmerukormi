import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { canEditCatalog, readableCatalog } from "../backend/domain/catalog/access";

const migrationName = "20261120120000_vetdietolog_pilaf_recipe";
const root = new URL("../backend/database/prisma/migrations/", import.meta.url);
const migration = readFileSync(new URL(`${migrationName}/migration.sql`, root), "utf8");
const sections = migration.split("$recipe$");
const definition = JSON.parse(sections[1]) as {
  id: string;
  name: string;
  source: string;
  sourceExternalId: string;
  baseQuantity: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  nutrients: Record<string, number>;
  recipeInstructions: string;
  recipeNotes: string;
};

test("the only imported recipe contains the published values per 100 grams", () => {
  assert.equal(sections.length, 3);
  assert.equal(definition.id, "vetdietolog-dog-pilaf");
  assert.equal(definition.source, "https://vetdietolog.ru/recipes/dogs/dog-pilaf");
  assert.equal(definition.sourceExternalId, "dog-pilaf");
  assert.equal(definition.baseQuantity, 100);
  assert.equal(definition.unit, "г");
  assert.deepEqual([definition.calories, definition.protein, definition.fat, definition.carbs], [126, 11, 3.3, 13.3]);
  assert.deepEqual(definition.nutrients, { CFi: 0.8, CAs: 1.4, MO: 69.6 });
  assert.equal((migration.match(/INSERT INTO "Product"/g) ?? []).length, 1);
});

test("the manual recipe keeps its instructions and required supplement without invented ingredients", () => {
  assert.equal(definition.recipeInstructions.split("\n").length, 5);
  assert.match(definition.name, /Adult Balance/);
  assert.match(definition.recipeNotes, /полноценность.*только с Vetdietolog Adult Balance/);
  assert.match(definition.recipeNotes, /масса готовой партии не заданы/);
  assert.match(definition.recipeInstructions, /не нагревать и не замораживать/);
  assert.equal("ingredients" in definition, false);
  assert.equal("yieldGrams" in definition, false);
  assert.doesNotMatch(migration, /INSERT INTO "(?:ProductMeasure|RecipeIngredient|RationItem)"/);
});

test("migration is atomic and never overwrites or restores existing business data", () => {
  assert.match(migration, /^BEGIN;[\s\S]+COMMIT;\s*$/);
  assert.match(migration, /ON CONFLICT DO NOTHING RETURNING "id" INTO inserted_id/);
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE|TRUNCATE)\b/);
  assert.doesNotMatch(migration, /INSERT INTO "(?:User|Pet|Customer|Ration|Calculation|Nutrient)"/);
  assert.match(migration, /"sourceExternalId" = definition->>'sourceExternalId'/);
  assert.match(migration, /WHEN 'мг' THEN 1000 WHEN 'мкг' THEN 1000000 ELSE 1/);
  assert.match(migration, /IF nutrient_count <> 3 THEN\s+RAISE EXCEPTION/);
});

test("recipe migration works on PostgreSQL and preserves user data and recipe edits", {
  skip: !process.env.TEST_DATABASE_URL,
  timeout: 180000,
}, async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL!;
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.endsWith("_test"), "Use an empty local database ending in _test");
  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const execute = (sql: string) => execFileSync(process.execPath, [
    "node_modules/prisma/build/index.js", "db", "execute", "--url", databaseUrl, "--stdin",
  ], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
  try {
    const tables = await database.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`;
    assert.equal(Number(tables[0].count), 0, "Never reset an existing database");
    for (const name of readdirSync(root).filter(name => /^\d/.test(name) && name < migrationName).sort()) {
      execute(readFileSync(new URL(`${name}/migration.sql`, root), "utf8"));
    }
    execute(`
      INSERT INTO "User" (id, username, name, email, "passwordHash", "updatedAt")
      VALUES ('recipe-test-owner', 'recipe-test-owner', 'Recipe test', 'recipe-test@example.test', 'unused-test-hash', now());
      INSERT INTO "Product" (id, name, "userId", calories, "updatedAt")
      VALUES ('recipe-test-product', 'Existing food', 'recipe-test-owner', 88, now());
      INSERT INTO "Ration" (id, name, "userId", "updatedAt")
      VALUES ('recipe-test-ration', 'Existing ration', 'recipe-test-owner', now());
      INSERT INTO "RationItem" (id, "rationId", "productId", quantity, grams, "productSnapshot")
      VALUES ('recipe-test-item', 'recipe-test-ration', 'recipe-test-product', 25, 25, '{"version":1,"marker":"unchanged"}');
    `);
    const originalProducts = await database.product.findMany({
      select: { id: true, name: true, calories: true, userId: true, isShared: true, deletedAt: true },
      orderBy: { id: "asc" },
    });
    const originalItems = await database.rationItem.findMany({ orderBy: { id: "asc" } });
    const originalUsers = await database.user.findMany({ orderBy: { id: "asc" } });

    execute(`UPDATE "Nutrient" SET "deletedAt" = now() WHERE "userId" = 'bootstrap-admin' AND code = 'CFi';`);
    assert.throws(() => execute(migration), /shared CFi, CAs and MO/);
    const columns = await database.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'recipeInstructions'
    `;
    assert.equal(Number(columns[0].count), 0, "Failure rolls back schema changes too");
    assert.equal(await database.product.count({ where: { id: definition.id } }), 0);

    execute(`
      UPDATE "Nutrient" SET "deletedAt" = NULL WHERE "userId" = 'bootstrap-admin' AND code = 'CFi';
      UPDATE "Nutrient" SET unit = 'мг' WHERE "userId" = 'bootstrap-admin' AND code = 'CAs';
      UPDATE "Nutrient" SET unit = 'мкг' WHERE "userId" = 'bootstrap-admin' AND code = 'MO';
    `);
    execute(migration);
    const recipe = await database.product.findUniqueOrThrow({
      where: { id: definition.id },
      include: { nutrients: { include: { nutrient: true } }, measures: true },
    });
    assert.equal(recipe.kind, "RECIPE");
    assert.equal(recipe.isShared, true);
    assert.equal(recipe.userId, "bootstrap-admin");
    assert.equal(recipe.baseQuantity, 100);
    assert.equal(recipe.source, definition.source);
    assert.deepEqual([recipe.calories, recipe.protein, recipe.fat, recipe.carbs], [126, 11, 3.3, 13.3]);
    assert.equal(recipe.recipeInstructions, definition.recipeInstructions);
    assert.equal(recipe.recipeNotes, definition.recipeNotes);
    assert.equal(recipe.measures.length, 0);
    assert.equal(recipe.nutrients.length, 3);
    for (const value of recipe.nutrients) {
      const factor = value.nutrient.unit === "мкг" ? 1_000_000 : value.nutrient.unit === "мг" ? 1000 : 1;
      assert.ok(Math.abs(value.amount! / factor - definition.nutrients[value.nutrient.code]) < 1e-8);
    }
    assert.equal(await database.product.count(), originalProducts.length + 1);
    assert.deepEqual(await database.product.findMany({
      where: { id: { in: originalProducts.map(product => product.id) } },
      select: { id: true, name: true, calories: true, userId: true, isShared: true, deletedAt: true },
      orderBy: { id: "asc" },
    }), originalProducts);
    assert.deepEqual(await database.rationItem.findMany({ orderBy: { id: "asc" } }), originalItems);
    assert.deepEqual(await database.user.findMany({ orderBy: { id: "asc" } }), originalUsers);

    const reader = { id: "recipe-test-owner", role: "USER" };
    assert.equal(await database.product.count({ where: { id: recipe.id, ...readableCatalog(reader) } }), 1);
    assert.equal(canEditCatalog(recipe, reader), false);
    assert.equal(canEditCatalog(recipe, { id: "bootstrap-admin", role: "ADMIN" }), true);
    execute(migration);
    assert.equal(await database.product.count(), originalProducts.length + 1);
    assert.deepEqual(await database.product.findUniqueOrThrow({
      where: { id: definition.id }, include: { nutrients: { include: { nutrient: true } }, measures: true },
    }), recipe);

    await database.product.update({ where: { id: recipe.id }, data: {
      calories: 222, archived: true, deletedAt: new Date(),
      recipeInstructions: "Edited instructions", recipeNotes: "Edited notes",
    } });
    await database.productNutrient.updateMany({ where: { productId: recipe.id }, data: { amount: 7, deletedAt: new Date() } });
    const edited = await database.product.findUniqueOrThrow({ where: { id: recipe.id }, include: { nutrients: true } });
    execute(migration);
    assert.deepEqual(await database.product.findUniqueOrThrow({ where: { id: recipe.id }, include: { nutrients: true } }), edited);

    await database.product.update({ where: { id: recipe.id }, data: { id: "recipe-test-same-source" } });
    execute(migration);
    assert.equal(await database.product.count({ where: { id: recipe.id } }), 0);
    assert.equal(await database.product.count(), originalProducts.length + 1);
  } finally {
    await database.$disconnect();
  }
});
