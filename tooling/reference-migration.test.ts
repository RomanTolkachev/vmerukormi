import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { generateReferenceMigration } from "../backend/database/prisma/catalog/reference/generate";

test("reference migration preserves existing data and converts linked quantities", async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assert.ok(databaseUrl, "Укажите TEST_DATABASE_URL пустой локальной тестовой базы");
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.endsWith("_test"), "Разрешена только локальная база с суффиксом _test");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const execute = (sql: string) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--url", databaseUrl, "--stdin"], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
  try {
    const tables = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`;
    assert.equal(Number(tables[0].count), 0, "Тест требует пустую БД и никогда не очищает существующую");
    const root = "backend/database/prisma/migrations";
    for (const migration of readdirSync(root).filter((name) => /^\d/.test(name) && name < "20261031090000").sort()) {
      execute(readFileSync(`${root}/${migration}/migration.sql`, "utf8"));
    }
    execute(`
      INSERT INTO "User" (id,username,"passwordHash","updatedAt") VALUES ('fixture-owner','fixture-owner','unused',now());
      INSERT INTO "Nutrient" (id,code,name,unit,category,"userId") VALUES
        ('fixture-a','A','Витамин A','МЕ','Витамины','fixture-owner'),
        ('fixture-retinol','Retinol','Ретинол','мг','Витамины','fixture-owner'),
        ('fixture-re','A_RE','Витамин А, РЭ','мкг','Витамины','fixture-owner'),
        ('fixture-d','D','Витамин D','мкг','Витамины','fixture-owner'),
        ('fixture-d3','D3','Витамин D3','МЕ','Витамины','fixture-owner'),
        ('fixture-e','E','Витамин E','мг','Витамины','fixture-owner'),
        ('fixture-j','J','Йод','мг','Минералы','fixture-owner'),
        ('fixture-tau','Tau','Таурин','мг','Аминокислоты','fixture-owner');
      INSERT INTO "Product" (id,name,"userId",source,"updatedAt") VALUES
        ('fixture-known','Известный источник','fixture-owner','health-diet',now()),
        ('fixture-unknown','Пользовательский продукт','fixture-owner',NULL,now()),
        ('fixture-zero','Нулевой продукт','fixture-owner',NULL,now());
      INSERT INTO "ProductNutrient" ("productId","nutrientId",amount) VALUES
        ('fixture-known','fixture-retinol',0.3),('fixture-known','fixture-re',900),
        ('fixture-known','fixture-d',2),('fixture-known','fixture-d3',40),('fixture-known','fixture-e',10),
        ('fixture-known','fixture-j',0.025),('fixture-known','fixture-tau',60),
        ('fixture-unknown','fixture-d3',20),('fixture-unknown','fixture-e',10),
        ('fixture-zero','fixture-a',0),('fixture-zero','fixture-retinol',0.3),('fixture-zero','fixture-tau',NULL);
      INSERT INTO "Module" (id,name,species) VALUES ('fixture-module','Тестовый модуль','CAT');
      INSERT INTO "ModuleFormulaVersion" (id,"moduleId",formula,tech_begin,tech_end) VALUES ('fixture-formula','fixture-module','70 * weight',now(),'9999-12-31');
      INSERT INTO "Calculation" (id,"moduleId","formulaVersionId","actualWeight","idealWeight",bcs,"baseEnergy","adjustedEnergy","userId") VALUES ('fixture-calculation','fixture-module','fixture-formula',4,4,5,200,200,'fixture-owner');
      INSERT INTO "CalculationNutrient" ("calculationId","nutrientId","targetAmount") VALUES
        ('fixture-calculation','fixture-j',0.3),('fixture-calculation','fixture-tau',100),('fixture-calculation','fixture-d3',30);
      INSERT INTO "Breed" (id,species,"nameRu","nameEn","maleIdealWeight","femaleIdealWeight") VALUES ('fixture-breed','CAT','Тест','Test',4,4);
      INSERT INTO "BreedStandard" (id,"breedId",sex,"idealWeight","proteinPer1000Kcal","fatPer1000Kcal","carbsPer1000Kcal","updatedAt","userId") VALUES ('fixture-standard','fixture-breed','MALE',4,50,20,10,now(),'fixture-owner');
      INSERT INTO "BreedStandardNutrient" ("standardId","nutrientId","amountPer1000Kcal") VALUES
        ('fixture-standard','fixture-j',0.33),('fixture-standard','fixture-tau',1000),('fixture-standard','fixture-d3',60);
    `);
    const originalProducts = await prisma.product.findMany({ select: { id: true, name: true, userId: true, isShared: true }, orderBy: { id: "asc" } });
    const valuesBefore = await prisma.$queryRaw<{ productId: string; nutrientId: string }[]>`SELECT "productId", "nutrientId" FROM "ProductNutrient"`;
    execute(generateReferenceMigration());
    assert.deepEqual(await prisma.product.findMany({ select: { id: true, name: true, userId: true, isShared: true }, orderBy: { id: "asc" } }), originalProducts);
    for (const key of valuesBefore) assert.ok(await prisma.productNutrient.findUnique({ where: { productId_nutrientId: key } }));
    const values = await prisma.productNutrient.findMany({ where: { productId: { startsWith: "fixture-" }, nutrient: { isReferenceOnly: false } }, include: { nutrient: true } });
    const amount = (productId: string, code: string) => values.find((value) => value.productId === productId && value.nutrient.code === code)?.amount;
    assert.ok(Math.abs(amount("fixture-known", "A")! - 1000) < 1e-8);
    assert.equal(amount("fixture-known", "D"), 80);
    assert.equal(amount("fixture-unknown", "D"), 20);
    assert.equal(amount("fixture-known", "E"), 14.9);
    assert.equal(amount("fixture-unknown", "E"), undefined);
    assert.equal(amount("fixture-known", "J"), 25);
    assert.equal(amount("fixture-known", "Tau"), 0.06);
    assert.equal(amount("fixture-zero", "A"), 0);
    assert.equal(amount("fixture-zero", "Tau"), null);
    assert.ok(values.every(({ nutrient }) => !["D3", "Retinol", "A_RE", "E_MG"].includes(nutrient.code)));
    assert.equal((await prisma.nutrient.findUniqueOrThrow({ where: { id: "fixture-e" } })).unit, "мг");
    assert.ok(await prisma.productNutrient.count({ where: { product: { source: "USDA FoodData Central SR Legacy" }, nutrient: { code: "E", unit: "МЕ", isReferenceOnly: false } } }) > 0);
    assert.equal(await prisma.nutrient.count({ where: { userId: "fixture-owner", isShared: true } }), 0);
    const targets = await prisma.calculationNutrient.findMany({ where: { calculationId: "fixture-calculation", nutrient: { isReferenceOnly: false } }, include: { nutrient: true } });
    assert.deepEqual(Object.fromEntries(targets.map((value) => [value.nutrient.code, value.targetAmount])), { D: 30, J: 300, Tau: 0.1 });
    const standards = await prisma.breedStandardNutrient.findMany({ where: { standardId: "fixture-standard", nutrient: { isReferenceOnly: false } }, include: { nutrient: true } });
    assert.deepEqual(Object.fromEntries(standards.map((value) => [value.nutrient.code, value.amountPer1000Kcal])), { D: 60, J: 330, Tau: 1 });
  } finally {
    await prisma.$disconnect();
  }
});
