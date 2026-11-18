import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { seedTestUsers } from "../backend/database/prisma/seed-users";
import { readProductSnapshot } from "../backend/domain/rations/snapshot";

test("account migrations preserve existing records and ration composition", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL!;
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.endsWith("_test"), "Use an empty local database ending in _test");
  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const execute = (sql: string) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--url", databaseUrl, "--stdin"], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
  try {
    const tables = await database.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`;
    assert.equal(Number(tables[0].count), 0, "Never reset an existing database");
    const root = "backend/database/prisma/migrations";
    const migrations = readdirSync(root).filter(name => /^\d/.test(name)).sort();
    for (const name of migrations.filter(name => name < "20261104090000")) execute(readFileSync(`${root}/${name}/migration.sql`, "utf8"));
    execute(`
      UPDATE "User" SET "passwordHash" = 'changed-before-upgrade' WHERE id = 'bootstrap-admin';
      INSERT INTO "User" (id,username,"passwordHash","updatedAt") VALUES ('qa-owner','qa-owner','unchanged-password',now());
      INSERT INTO "Product" (id,name,"userId",calories,"updatedAt") VALUES ('qa-product','Saved food','qa-owner',100,now());
      INSERT INTO "ProductMeasure" (id,name,grams,"productId") VALUES ('qa-measure','Saved measure',50,'qa-product');
      INSERT INTO "Nutrient" (id,code,name,unit,category,"userId") VALUES ('qa-nutrient','QA','Saved mineral','мг','Минералы','qa-owner');
      INSERT INTO "ProductNutrient" ("productId","nutrientId",amount) VALUES ('qa-product','qa-nutrient',0.004);
      INSERT INTO "Ration" (id,name,"userId","updatedAt") VALUES ('qa-ration','Saved ration','qa-owner',now());
      INSERT INTO "RationItem" (id,"rationId","productId","measureId",quantity,grams) VALUES ('qa-item','qa-ration','qa-product','qa-measure',2,60);
    `);
    for (const name of migrations.filter(name => name >= "20261104090000")) execute(readFileSync(`${root}/${name}/migration.sql`, "utf8"));
    const admin = await database.user.findUniqueOrThrow({ where: { id: "bootstrap-admin" } });
    assert.equal(admin.email, "admin@vetenergy.ru");
    assert.equal(admin.passwordHash, "changed-before-upgrade");
    const owner = await database.user.findUniqueOrThrow({ where: { id: "qa-owner" } });
    assert.equal(owner.email, "legacy-71612d6f776e6572@vetenergy.test");
    assert.equal(owner.passwordHash, "unchanged-password");
    const item = await database.rationItem.findUniqueOrThrow({ where: { id: "qa-item" } });
    const snapshot = readProductSnapshot(item.productSnapshot)!;
    assert.ok(snapshot);
    assert.equal(snapshot.product.calories, 100);
    assert.equal(snapshot.product.nutrients[0].amount, 0.004);
    assert.equal(snapshot.measure?.grams, 30);
    assert.equal(item.grams, 60);
    for (const operation of [
      () => database.product.delete({ where: { id: "qa-product" } }),
      () => database.productMeasure.delete({ where: { id: "qa-measure" } }),
      () => database.user.delete({ where: { id: "qa-owner" } }),
      () => database.ration.delete({ where: { id: "qa-ration" } }),
    ]) await assert.rejects(operation, { code: "P2003" });
    await database.product.update({ where: { id: "qa-product" }, data: { calories: 999, deletedAt: new Date() } });
    assert.deepEqual((await database.rationItem.findUniqueOrThrow({ where: { id: "qa-item" } })).productSnapshot, item.productSnapshot);
    await seedTestUsers(database);
    await database.user.update({ where: { id: "seed-user-1" }, data: { passwordHash: "changed-after-seed" } });
    await seedTestUsers(database);
    assert.equal((await database.user.findUniqueOrThrow({ where: { id: "seed-user-1" } })).passwordHash, "changed-after-seed");
    await assert.rejects(database.user.create({ data: { id: "qa-case", username: "qa-case", name: "Invalid", email: "ADMIN@VETENERGY.RU", passwordHash: "unused" } }));
  } finally { await database.$disconnect(); }
});
