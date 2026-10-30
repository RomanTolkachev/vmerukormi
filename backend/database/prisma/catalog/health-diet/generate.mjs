import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fingerprint, requiredNutrients, validateProduct } from "./parser.mjs";

const groups = { meat: "Мясо и птица", offal: "Субпродукты", fish: "Рыба", dairy: "Молочные продукты", eggs: "Яйца", grains: "Крупы", vegetables: "Овощи", fruit: "Фрукты", oils: "Масла" };
const preparations = { raw: "Сырой продукт", cooked: "Приготовленный продукт", boiled: "Варёный продукт", dry: "Сухой продукт", plain: "Без добавок" };
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function generateMigration(snapshot, manifest) {
  if (new Set(snapshot.products.map(({ id }) => id)).size !== manifest.length || snapshot.products.length !== manifest.length) throw new Error("Неполный каталог или повтор продуктов");
  const definitions = new Map(requiredNutrients.map((nutrient) => [nutrient.code, nutrient]));
  const products = [...snapshot.products].sort((left, right) => Number(left.id) - Number(right.id)).map((product) => {
    if (!groups[product.group] || !preparations[product.preparation]) throw new Error("Неизвестная группа или подготовка");
    const values = validateProduct(product, manifest);
    for (const nutrient of values) {
      const previous = definitions.get(nutrient.code);
      if (previous && previous.unit !== nutrient.unit) throw new Error(`Конфликт единиц ${nutrient.code}`);
      if (!previous) definitions.set(nutrient.code, nutrient);
    }
    return { ...product, values };
  });
  const nutrients = [...definitions.values()].sort((left, right) => left.code.localeCompare(right.code, "en"));
  const sql = ["BEGIN;"];
  for (const [slug, name] of Object.entries(groups)) {
    sql.push(`INSERT INTO "ProductGroup" ("id", "name", "userId", "isShared") VALUES (${quote(`hd-group-${slug}`)}, ${quote(name)}, 'bootstrap-admin', true) ON CONFLICT ("id") DO UPDATE SET "isShared" = true;`);
  }
  for (const [slug, name] of Object.entries({ ...groups, ...preparations })) {
    sql.push(`INSERT INTO "ProductTag" ("id", "name", "slug", "userId", "isShared") VALUES (${quote(`hd-tag-${slug}`)}, ${quote(name)}, ${quote(`hd-${slug}`)}, 'bootstrap-admin', true) ON CONFLICT ("userId", "slug") DO UPDATE SET "isShared" = true;`);
  }
  for (const nutrient of nutrients) {
    sql.push(`INSERT INTO "Nutrient" ("id", "code", "name", "category", "unit", "userId", "isShared") VALUES (${quote(`hd-nutrient-${nutrient.code}`)}, ${quote(nutrient.code)}, ${quote(nutrient.name)}, ${quote(nutrient.category)}, ${quote(nutrient.unit)}, 'bootstrap-admin', true) ON CONFLICT ("userId", "code") DO UPDATE SET "isShared" = true;`);
    sql.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Nutrient" WHERE "userId" = 'bootstrap-admin' AND "code" = ${quote(nutrient.code)} AND "unit" <> ${quote(nutrient.unit)}) THEN RAISE EXCEPTION 'Incompatible nutrient unit'; END IF; END $$;`);
  }
  for (const product of products) {
    const id = quote(`hd-product-${product.id}`);
    const amount = (code) => product.values.find((value) => value.code === code)?.amount ?? 0;
    sql.push(`INSERT INTO "Product" ("id", "name", "kind", "groupId", "baseQuantity", "unit", "calories", "protein", "fat", "carbs", "source", "sourceExternalId", "archived", "createdAt", "updatedAt", "userId", "isShared") VALUES (${id}, ${quote(product.name)}, 'PRODUCT', ${quote(`hd-group-${product.group}`)}, 100, 'г', ${amount("Energy")}, ${amount("CP")}, ${amount("CFa")}, ${amount("CH")}, 'health-diet', ${quote(product.id)}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'bootstrap-admin', true) ON CONFLICT ("userId", "source", "sourceExternalId") DO NOTHING;`);
    for (const value of product.values) {
      sql.push(`INSERT INTO "ProductNutrient" ("productId", "nutrientId", "amount") SELECT product."id", nutrient."id", ${value.amount} FROM "Product" product CROSS JOIN "Nutrient" nutrient WHERE product."userId" = 'bootstrap-admin' AND product."source" = 'health-diet' AND product."sourceExternalId" = ${quote(product.id)} AND nutrient."userId" = 'bootstrap-admin' AND nutrient."code" = ${quote(value.code)} ON CONFLICT ("productId", "nutrientId") DO NOTHING;`);
    }
    for (const tag of [product.group, product.preparation]) {
      sql.push(`INSERT INTO "ProductTagLink" ("productId", "tagId") SELECT product."id", tag."id" FROM "Product" product CROSS JOIN "ProductTag" tag WHERE product."userId" = 'bootstrap-admin' AND product."source" = 'health-diet' AND product."sourceExternalId" = ${quote(product.id)} AND tag."userId" = 'bootstrap-admin' AND tag."slug" = ${quote(`hd-${tag}`)} ON CONFLICT DO NOTHING;`);
    }
  }
  sql.push("COMMIT;", "");
  return { sql: sql.join("\n"), report: { products: products.length, nutrients: nutrients.length, values: products.reduce((count, product) => count + product.values.length, 0), snapshotSha256: fingerprint(JSON.stringify(snapshot)), retrievedAt: snapshot.retrievedAt } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const snapshot = JSON.parse(readFileSync(new URL("./snapshot.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));
  const result = generateMigration(snapshot, manifest);
  process.stdout.write(process.argv.includes("--report") ? `${JSON.stringify(result.report, null, 2)}\n` : result.sql);
}
