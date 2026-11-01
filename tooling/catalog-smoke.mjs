import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const base = process.env.CATALOG_TEST_APP_URL;
const database = process.env.DATABASE_URL;
if (!base || !database || !new URL(database).pathname.includes("catalog_test") || !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use an isolated catalog_test database and a local test app");
const prisma = new PrismaClient();
const prefix = `catalog-smoke-${Date.now()}`;
const users = [];
const hash = (token) => createHash("sha256").update(token).digest("base64url");

async function actor(role) {
  const id = `${prefix}-${users.length}`;
  await prisma.user.create({ data: { id, username: id, passwordHash: "disabled-test-login", role } });
  users.push(id);
  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { userId: id, tokenHash: hash(token), csrfTokenHash: hash(csrf), expiresAt: new Date(Date.now() + 600000) } });
  return {
    id,
    request: (path, method = "GET", body) => fetch(`${base}${path}`, {
      method,
      headers: { cookie: `vet_session=${token}; vet_csrf=${csrf}`, "x-csrf-token": csrf, origin: base, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  };
}

async function json(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}

try {
  const admin = await actor("ADMIN");
  const alice = await actor("USER");
  const bob = await actor("USER");
  const initial = await json(await alice.request("/api/workspace/products?per_page=1000"));
  assert.equal(initial.total, 24);
  assert.ok(initial.rows.every((row) => row.isShared && !row.canEdit));
  const nutrientRows = await json(await bob.request("/api/workspace/nutrients?per_page=1000"));
  assert.equal(nutrientRows.total, await prisma.nutrient.count({ where: { isShared: true, isReferenceOnly: false } }));
  assert.ok(nutrientRows.rows.every((row) => !row.isReferenceOnly));
  assert.ok(nutrientRows.rows.some((row) => row.code === "E" && row.unit === "МЕ"));
  assert.ok(nutrientRows.rows.some((row) => row.code === "Tau"));
  const searched = await json(await alice.request(`/api/workspace/products?search=${encodeURIComponent("СУБПРОДУКТЫ")}`));
  assert.equal(searched.total, 3);
  const tagged = await json(await bob.request("/api/workspace/products?tagId=hd-tag-boiled"));
  assert.equal(tagged.total, 3);
  const noMatch = await json(await bob.request(`/api/workspace/products?tagId=hd-tag-boiled&search=${encodeURIComponent("Индейка")}`));
  assert.equal(noMatch.total, 0);
  const privateProduct = await json(await alice.request("/api/workspace/products", "POST", { name: prefix, kind: "PRODUCT" }), 201);
  assert.equal((await fetch(`${base}/api/options/products`)).status, 401);
  assert.equal((await json(await alice.request(`/api/options/products?id=${privateProduct.id}`)))[0].value, privateProduct.id);
  assert.deepEqual(await json(await bob.request(`/api/options/products?id=${privateProduct.id}`)), []);
  assert.deepEqual(await json(await alice.request(`/api/options/products?id=${privateProduct.id}&shared=true`)), []);
  assert.ok((await json(await alice.request("/api/options/products?search=" + encodeURIComponent("Греч")))).every(option => option.label.includes("Греч")));
  const customer = await json(await alice.request("/api/workspace/customers", "POST", { name: prefix }), 201);
  const pet = await json(await alice.request("/api/pets", "POST", { name: prefix, customerId: customer.id, species: "DOG", actualWeight: 20, idealWeight: 18, bcs: 6 }), 201);
  assert.equal((await json(await alice.request(`/api/options/pets?customerId=${customer.id}`)))[0].value, pet.id);
  assert.deepEqual(await json(await bob.request(`/api/options/pets?id=${pet.id}`)), []);
  assert.deepEqual(await json(await alice.request(`/api/options/pets?id=${pet.id}&species=CAT`)), []);
  assert.deepEqual(await json(await alice.request(`/api/options/pets?id=${pet.id}&customerId=`)), []);
  const tableSettings = { columns: { order: ["name"], visible: { kind: false }, resized: { name: 240 }, pinned: { left: ["name"], right: [] } }, query: { universalTableState: { version: 1, query: { per_page: 50 } } } };
  await json(await alice.request("/api/table-options/workspace-products", "PUT", tableSettings));
  assert.deepEqual(await json(await alice.request("/api/table-options/workspace-products")), tableSettings);
  assert.deepEqual(await json(await bob.request("/api/table-options/workspace-products")), {});
  assert.equal((await json(await bob.request(`/api/workspace/products?search=${prefix}`))).total, 0);
  assert.equal((await alice.request("/api/workspace/products", "POST", { name: prefix, kind: "PRODUCT", isShared: true })).status, 403);
  const sharedProduct = await json(await admin.request("/api/workspace/products", "POST", { name: `${prefix}-shared`, kind: "PRODUCT", isShared: true }), 201);
  const patch = { name: `${prefix}-edited`, kind: "PRODUCT", groupId: null, baseQuantity: 100, unit: "г", calories: 20, protein: 1, fat: 1, carbs: 2, archived: false, tagIds: [] };
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}`, "PATCH", patch)).status, 404);
  assert.equal((await bob.request(`/api/products/${privateProduct.id}`, "PATCH", patch)).status, 404);
  assert.equal((await admin.request(`/api/products/${privateProduct.id}`, "PATCH", patch)).status, 404);
  assert.equal((await admin.request(`/api/products/${sharedProduct.id}`, "PATCH", patch)).status, 200);
  assert.equal((await alice.request(`/api/workspace/products/${sharedProduct.id}`, "DELETE")).status, 404);
  const water = nutrientRows.rows.find((row) => row.code === "MO");
  const privateNutrient = await json(await alice.request("/api/workspace/nutrients", "POST", { code: prefix, name: prefix, category: "Test", unit: "г" }), 201);
  assert.deepEqual(await json(await bob.request(`/api/options/nutrients?id=${privateNutrient.id}`)), []);
  assert.ok((await json(await alice.request("/api/options/nutrients"))).every(option => !option.data.isReferenceOnly));
  assert.equal((await admin.request(`/api/products/${sharedProduct.id}/nutrients`, "POST", { nutrientId: privateNutrient.id, amount: 1 })).status, 404);
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}/nutrients`, "POST", { nutrientId: water.id, amount: 1 })).status, 404);
  assert.equal((await admin.request(`/api/products/${sharedProduct.id}/nutrients`, "POST", { nutrientId: water.id, amount: 10 })).status, 201);
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}/nutrients/${water.id}`, "PATCH", { amount: 1 })).status, 404);
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}/nutrients/${water.id}`, "DELETE")).status, 404);
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}/measures`, "POST", { name: "ложка", grams: 10 })).status, 404);
  const measure = await json(await admin.request(`/api/products/${sharedProduct.id}/measures`, "POST", { name: "ложка", grams: 10 }), 201);
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}/measures/${measure.id}`, "PATCH", { name: "ложка", grams: 20 })).status, 404);
  assert.equal((await alice.request(`/api/products/${sharedProduct.id}/measures/${measure.id}`, "DELETE")).status, 404);
  assert.equal((await alice.request("/api/product-tags", "POST", { name: prefix, isShared: true })).status, 403);
  const privateTag = await json(await admin.request("/api/product-tags", "POST", { name: prefix }), 201);
  assert.equal((await admin.request(`/api/products/${sharedProduct.id}`, "PATCH", { ...patch, tagIds: [privateTag.id] })).status, 404);
  const ration = await json(await bob.request("/api/rations", "POST", { name: prefix }), 201);
  const rationItem = await json(await bob.request(`/api/rations/${ration.id}/items`, "POST", { productId: "hd-product-19916", quantity: 100 }), 201);
  assert.equal((await bob.request(`/api/rations/${ration.id}/items`, "POST", { productId: privateProduct.id, quantity: 100 })).status, 404);
  assert.equal((await alice.request(`/api/rations/${ration.id}/items`, "POST", { productId: "hd-product-19916", quantity: 100 })).status, 404);
  assert.equal((await bob.request(`/api/rations/${ration.id}/items/${rationItem.id}`, "PATCH", { productId: "hd-product-698", quantity: 100 })).status, 200);
  const page = await bob.request(`/rations/${ration.id}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes("Влага") && html.includes("Таурин") && html.includes("Нет данных"));
  const productPage = await bob.request("/products/hd-product-698");
  assert.equal(productPage.status, 200);
  assert.match(await productPage.text(), /Редактирование доступно администратору/);
  const exported = await bob.request(`/api/rations/${ration.id}/export`);
  assert.equal(exported.status, 200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exported.arrayBuffer());
  const rows = workbook.getWorksheet("Нутриенты").getSheetValues();
  assert.ok(rows.some((row) => row?.[1] === "Tau" && row[5] === 0 && row[6] === "Нет полных данных"));
  assert.ok(rows.some((row) => row?.[1] === "MO" && row[5] === 73));
  console.log("Catalog smoke passed: two new users, admin/private boundaries, all mutation types, tags, rations and XLSX.");
} finally {
  await prisma.ration.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}
