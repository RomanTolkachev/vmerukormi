import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { formulaTemplates } from "../backend/domain/nutrition/parameters";

test("formula migration adds templates without recalculating historical calculations or rations", { skip: !process.env.TEST_DATABASE_URL, timeout: 180000 }, async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL!;
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.endsWith("_test"));
  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const root = new URL("../backend/database/prisma/migrations/", import.meta.url);
  const name = "20261122090000_formula_parameters";
  const execute = (sql: string) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--url", databaseUrl, "--stdin"], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
  try {
    const tables = await database.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`;
    assert.equal(Number(tables[0].count), 0, "Never reset an existing database");
    for (const previous of readdirSync(root).filter(value => /^\d/.test(value) && value < name).sort()) execute(readFileSync(new URL(`${previous}/migration.sql`, root), "utf8"));
    execute(`
      UPDATE "ModuleFormulaVersion" SET formula = '999 * IW' WHERE "moduleId" = 'cat-adult' AND tech_end = '2399-12-31 23:59:59.999';
      INSERT INTO "Calculation" (id, "moduleId", "formulaVersionId", "userId", "actualWeight", "idealWeight", bcs, "baseEnergy", "adjustedEnergy", protein, fat, carbs)
        SELECT 'formula-migration-calculation', 'cat-adult', id, 'bootstrap-admin', 5, 5, 5, 123, 234, 5, 6, 7 FROM "ModuleFormulaVersion" WHERE "moduleId" = 'cat-adult' AND tech_end = '2399-12-31 23:59:59.999';
      INSERT INTO "Ration" (id, name, "userId", "calculationId", "targetEnergy", "updatedAt")
        VALUES ('formula-migration-ration', 'Historical ration', 'bootstrap-admin', 'formula-migration-calculation', 234, now());
    `);
    const before = await database.$queryRaw<{ formulaVersionId: string }[]>`SELECT "formulaVersionId" FROM "Calculation" WHERE id = 'formula-migration-calculation'`;
    execute(readFileSync(new URL(`${name}/migration.sql`, root), "utf8"));
    const calculation = await database.calculation.findUniqueOrThrow({ where: { id: "formula-migration-calculation" } });
    assert.equal(calculation.formulaVersionId, before[0].formulaVersionId);
    assert.deepEqual([calculation.baseEnergy, calculation.adjustedEnergy, calculation.protein, calculation.fat, calculation.carbs], [123, 234, 5, 6, 7]);
    assert.equal((calculation.formulaSnapshot as { formula: string }).formula, "999 * IW");
    assert.equal(calculation.busBegin.toISOString(), calculation.createdAt.toISOString());
    const ration = await database.ration.findUniqueOrThrow({ where: { id: "formula-migration-ration" } });
    assert.equal(ration.calculationId, calculation.id); assert.equal(ration.targetEnergy, 234);
    const versions = await database.moduleFormulaVersion.findMany({ where: { templateKey: { not: null } } });
    assert.equal(versions.length, formulaTemplates.length);
    for (const template of formulaTemplates) {
      const version = versions.find(value => value.templateKey === template.key)!;
      assert.equal(version.formula, template.formula);
      assert.deepEqual(version.speciesCodes, template.speciesCodes);
    }
    assert.equal(await database.moduleFormulaVersion.count({ where: { moduleId: "cat-adult", techEnd: new Date("2399-12-31T23:59:59.999Z") } }), 1);
    const original = await database.moduleFormulaVersion.findUniqueOrThrow({ where: { id: before[0].formulaVersionId } });
    assert.equal(original.formula, "999 * IW");
    assert.ok(original.techEnd < new Date("2399-01-01"));
    assert.equal(await database.animalSpecies.count(), 2);
    const columns = await database.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'Calculation'`;
    assert.ok(!columns.some(column => column.column_name === "pregnancyWeek"));
    await assert.rejects(database.calculation.create({ data: { id: "duplicate", name: `  ${calculation.name.toUpperCase()}  `, userId: calculation.userId, moduleId: calculation.moduleId, formulaVersionId: calculation.formulaVersionId, baseEnergy: 123, adjustedEnergy: 234 } }), /Unique constraint/);
  } finally { await database.$disconnect(); }
});
