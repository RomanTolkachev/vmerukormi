import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { emptyProduct, changeProductKind, type ProductDraft, type RecipeIngredient } from "../backend/domain/catalog/recipe";

type Product = ProductDraft & { id: string; revision: number; isShared: boolean; deletedAt: string | null };
type Version = { id: string; revision: number; busBegin: string; busEnd: string | null; snapshot: Product };
const base = process.env.RECIPES_TEST_URL ?? "http://127.0.0.1:3000";
class Client {
  cookies = new Map<string, string>();
  async request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(base + path, { method, headers: { origin: base, "content-type": "application/json", cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "), "x-csrf-token": this.cookies.get("vet_csrf") ?? "" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0]; const separator = pair.indexOf("="); this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1)); }
    return response;
  }
  async json<Value>(path: string, method = "GET", body?: unknown, status = 200): Promise<Value> {
    const response = await this.request(path, method, body);
    const content = await response.text();
    assert.equal(response.status, status, `${method} ${path}: ${content.slice(0, 350)}`);
    return content ? JSON.parse(content) as Value : undefined as Value;
  }
}
function payload(product: Product, patch: Partial<Product> = {}) {
  const value = { ...product, ...patch };
  return { ...value, expectedRevision: product.revision, recipeIngredients: value.recipeIngredients.map(ingredient => ({ productId: ingredient.productId, grams: ingredient.grams, sourceRevision: ingredient.snapshot.revision })) };
}

test("recipe forms, permissions, temporal history, soft deletion and ration exports", { skip: process.env.RUN_RECIPES_INTEGRATION !== "1", timeout: 180000 }, async context => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const databaseUrl = process.env.RECIPES_TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/vet_calorie";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname));
  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const admin = new Client(), owner = new Client(), stranger = new Client();
  const suffix = Date.now().toString(36);
  const users: string[] = [], products: string[] = [];
  let rationId = "";
  const create = async (client: Client, data: Partial<ProductDraft>) => { const product = await client.json<Product>("/api/products", "POST", { ...emptyProduct(), ...data }, 201); products.push(product.id); return product; };
  try {
    await admin.json("/api/auth/login", "POST", { email: "admin@vetenergy.ru", password: "123456" });
    for (const [index, client] of [owner, stranger].entries()) {
      const email = `recipes-${suffix}-${index}@vetenergy.test`;
      const user = await admin.json<{ id: string }>("/api/users", "POST", { name: `Recipes QA ${suffix} ${index}`, email, password: "Recipe123456" }, 201);
      users.push(user.id); await client.json("/api/auth/login", "POST", { email, password: "Recipe123456" });
    }
    const definitions = await owner.json<{ value: string; data: { code: string } }[]>("/api/options/nutrients?search=" + encodeURIComponent("клетчат"));
    const fiber = definitions.find(value => value.data.code === "CFi")!;
    assert.ok(fiber, "CFi reference exists");
    let potato = await create(owner, { name: `Картофель QA ${suffix}`, calories: 80, protein: 2, carbs: 17, nutrients: [{ nutrientId: fiber.value, amount: 2 } as ProductDraft["nutrients"][number]], measures: [{ id: "", name: "Саше", grams: 100 }] });
    const supplement = await create(owner, { name: `Добавка QA ${suffix}`, kind: "SUPPLEMENT", calories: 10, protein: 1, baseQuantity: 1, nutrients: [{ nutrientId: fiber.value, amount: 2 } as ProductDraft["nutrients"][number]] });
    const foreign = await create(stranger, { name: `Чужой продукт QA ${suffix}`, calories: 50 });
    const preview = await owner.json<Pick<Product, "calories" | "protein" | "fat" | "carbs" | "nutrients" | "recipeIngredients">>("/api/products/recipe-preview", "POST", { recipeIngredients: [{ productId: potato.id, grams: 200 }, { productId: supplement.id, grams: 0.5 }], recipeYieldGrams: 250 });
    let recipe = await create(owner, { ...preview, name: `Рецепт QA ${suffix}`, kind: "RECIPE", recipeYieldGrams: 250, recipeInstructions: "1. Приготовить.\n2. Остудить.", recipeIngredients: preview.recipeIngredients.map(value => ({ ...value, sourceRevision: value.snapshot.revision })) as RecipeIngredient[] });
    assert.equal(recipe.calories, 66); assert.equal(recipe.protein, 1.8); assert.equal(recipe.nutrients[0].amount, 2);
    const firstVersion = (await owner.json<Version[]>(`/api/products/${recipe.id}/versions`))[0];
    const originalVersion = await owner.json<Version>(`/api/products/${recipe.id}/versions?versionId=${firstVersion.id}`);
    const originalRecipe = recipe;
    await context.test("public and personal catalogs, history and ingredient filtering enforce access", async () => {
      const shared = await create(admin, { name: `Общий рецепт QA ${suffix}`, kind: "RECIPE", protein: 5 });
      assert.equal(shared.isShared, true);
      await owner.json(`/api/products/${shared.id}`);
      await owner.json(`/api/products/${shared.id}/versions`, "GET", undefined, 404);
      await owner.json(`/api/products/${shared.id}`, "PATCH", payload(shared), 404);
      await stranger.json(`/api/products/${recipe.id}`, "GET", undefined, 404);
      await stranger.json(`/api/products/${recipe.id}/versions`, "GET", undefined, 404);
      await owner.json("/api/products/recipe-preview", "POST", { recipeIngredients: [{ productId: foreign.id, grams: 10 }], recipeYieldGrams: 10 }, 409);
      await admin.json("/api/products/recipe-preview", "POST", { isShared: true, recipeIngredients: [{ productId: potato.id, grams: 10 }], recipeYieldGrams: 10 }, 409);
      await owner.json("/api/products/recipe-preview", "POST", { recipeIngredients: [{ productId: recipe.id, grams: 10 }], recipeYieldGrams: 10 }, 409);
      await admin.json("/api/products/recipe-preview", "POST", { id: recipe.id, recipeIngredients: [{ productId: foreign.id, grams: 10 }], recipeYieldGrams: 10 }, 409);
      assert.deepEqual(await admin.json(`/api/options/products?ingredients=true&parentProductId=${recipe.id}&id=${foreign.id}`), []);
      await owner.json("/api/products/recipe-preview", "POST", { recipeIngredients: [{ productId: potato.id, grams: 10 }, { productId: potato.id, grams: 20 }], recipeYieldGrams: 30 }, 400);
      await owner.json("/api/products/recipe-preview", "POST", { recipeIngredients: [{ productId: potato.id, grams: 10 }], recipeYieldGrams: 0 }, 400);
      const choices = await owner.json<{ value: string }[]>(`/api/options/products?ingredients=true&id=${recipe.id}`);
      assert.equal(choices.length, 0);
      const list = await owner.json<{ rows: Product[] }>("/api/workspace/recipes?search=" + suffix);
      assert.ok(list.rows.some(row => row.id === recipe.id));
      assert.ok(list.rows.every(row => row.kind === "RECIPE"));
    });
    await context.test("manual overrides, complete saves, stale writes and immutable version intervals", async () => {
      recipe = await owner.json<Product>(`/api/products/${recipe.id}`, "PATCH", payload(recipe, { protein: recipe.protein * 2, nutrients: [{ ...recipe.nutrients[0], amount: 4 }] }));
      assert.equal(recipe.protein, 3.6); assert.equal(recipe.revision, 2);
      await owner.json(`/api/products/${recipe.id}`, "PATCH", payload(originalRecipe), 409);
      await owner.json(`/api/products/${recipe.id}/nutrients`, "POST", { nutrientId: fiber.value, amount: 8 }, 409);
      const before = await owner.json<Version[]>(`/api/products/${recipe.id}/versions`);
      await owner.json(`/api/products/${recipe.id}`, "PATCH", payload(recipe, { measures: [{ id: potato.measures[0].id, name: "Чужая мера", grams: 123 }] }), 400);
      assert.equal((await owner.json<Version[]>(`/api/products/${recipe.id}/versions`)).length, before.length);
      const race = await Promise.all([owner.request(`/api/products/${recipe.id}`, "PATCH", payload(recipe, { protein: 6 })), owner.request(`/api/products/${recipe.id}`, "PATCH", payload(recipe, { protein: 7 }))]);
      assert.deepEqual(race.map(value => value.status).sort(), [200, 409]);
      recipe = await owner.json<Product>(`/api/products/${recipe.id}`);
      const versions = await owner.json<Version[]>(`/api/products/${recipe.id}/versions`);
      assert.equal(versions.filter(version => !version.busEnd).length, 1);
      for (let index = 1; index < versions.length; index++) assert.equal(versions[index].busEnd, versions[index - 1].busBegin);
      assert.deepEqual((await owner.json<Version>(`/api/products/${recipe.id}/versions?versionId=${originalVersion.id}`)).snapshot, originalVersion.snapshot);
      await assert.rejects(database.productVersion.update({ where: { id: originalVersion.id }, data: { action: "TAMPER" } }), /closing the current/);
    });
    const ration = await owner.json<{ id: string }>("/api/rations", "POST", { name: `Рацион QA ${suffix}` }, 201); rationId = ration.id;
    const item = await owner.json<{ id: string }>(`/api/rations/${ration.id}/items`, "POST", { productId: recipe.id, quantity: 100 }, 201);
    const savedItem = await database.rationItem.findUniqueOrThrow({ where: { id: item.id } });
    await context.test("reset takes current composition, changed or deleted ingredients block the entire operation", async () => {
      const beforeUpdate = recipe;
      potato = await owner.json<Product>(`/api/products/${potato.id}`, "PATCH", payload(potato, { protein: 10 }));
      await owner.json(`/api/products/${recipe.id}`, "PATCH", payload(recipe, { recipeYieldGrams: 260 }), 409);
      assert.deepEqual(await owner.json(`/api/products/${recipe.id}`), beforeUpdate);
      recipe = await owner.json<Product>(`/api/products/${recipe.id}`, "PATCH", { ...payload(recipe), recalculate: true });
      assert.equal(recipe.protein, 8.2);
      assert.equal(recipe.nutrients[0].amount, 2);
      assert.deepEqual(await database.rationItem.findUniqueOrThrow({ where: { id: item.id } }), savedItem);
      await owner.json(`/api/workspace/products/${potato.id}`, "DELETE", undefined, 204);
      const before = await owner.json<Product>(`/api/products/${recipe.id}`);
      await owner.json(`/api/products/${recipe.id}`, "PATCH", { ...payload(recipe), recalculate: true }, 409);
      assert.deepEqual(await owner.json(`/api/products/${recipe.id}`), before);
      await owner.json("/api/archive", "POST", { resource: "products", key: { id: potato.id } });
      potato = await owner.json<Product>(`/api/products/${potato.id}`);
      potato = await owner.json<Product>(`/api/products/${potato.id}`, "PATCH", payload(potato, changeProductKind(potato, "RECIPE")));
      await owner.json("/api/products/recipe-preview", "POST", { id: recipe.id, recipeIngredients: [{ productId: potato.id, grams: 200 }], recipeYieldGrams: 200 }, 409);
    });
    await context.test("type changes and restores preserve history and ration snapshots; empty reset zeros all values", async () => {
      recipe = await owner.json<Product>(`/api/products/${recipe.id}`, "PATCH", payload(recipe, changeProductKind(recipe, "PRODUCT")));
      assert.equal(recipe.protein, 0); assert.equal(recipe.nutrients[0].amount, 0); assert.equal(recipe.recipeIngredients.length, 0);
      recipe = await owner.json<Product>(`/api/products/${recipe.id}/versions`, "POST", { versionId: originalVersion.id, expectedRevision: recipe.revision });
      assert.equal(recipe.kind, "RECIPE"); assert.equal(recipe.protein, 1.8); assert.equal(recipe.recipeIngredients.length, 2);
      assert.equal(recipe.recipeInstructions, originalRecipe.recipeInstructions);
      assert.deepEqual(await database.rationItem.findUniqueOrThrow({ where: { id: item.id } }), savedItem);
      const manual = await create(owner, { name: `Ручной рецепт QA ${suffix}`, kind: "RECIPE", calories: 250, protein: 12, nutrients: recipe.nutrients });
      const zero = await owner.json<Product>(`/api/products/${manual.id}`, "PATCH", { ...payload(manual), recalculate: true });
      assert.deepEqual([zero.calories, zero.protein, zero.fat, zero.carbs], [0, 0, 0, 0]);
      assert.ok(zero.nutrients.every(value => value.amount === 0));
    });
    await context.test("export includes recipe fiber and omits soft-deleted ration rows", async () => {
      const workbook = new ExcelJS.Workbook();
      const response = await owner.request(`/api/rations/${ration.id}/export`);
      assert.equal(response.status, 200);
      await workbook.xlsx.load(await response.arrayBuffer());
      const content = JSON.stringify(workbook.model);
      assert.match(content, /клетчат/i); assert.ok(content.includes(recipe.name));
      await owner.json(`/api/rations/${ration.id}/items/${item.id}`, "DELETE", undefined, 204);
      const after = await owner.request(`/api/rations/${ration.id}/export`);
      const empty = new ExcelJS.Workbook(); await empty.xlsx.load(await after.arrayBuffer());
      assert.ok(!JSON.stringify(empty.model).includes(recipe.name));
    });
  } finally {
    for (const id of products) { const response = await admin.request(`/api/workspace/products/${id}`, "DELETE"); assert.ok([204, 404].includes(response.status)); }
    if (rationId) await admin.request(`/api/rations/${rationId}`, "DELETE");
    for (const id of users) await admin.request(`/api/users/${id}`, "DELETE");
    await database.$disconnect();
  }
});
