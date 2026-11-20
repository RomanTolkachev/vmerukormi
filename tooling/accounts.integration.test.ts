import assert from "node:assert/strict";
import test from "node:test";
import { solveChallenge, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/sha";
import ExcelJS from "exceljs";

const base = process.env.ACCOUNTS_TEST_URL ?? "http://127.0.0.1:3000";
class Client {
  cookies = new Map<string, string>();
  async request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(base + path, {
      method, headers: { origin: base, "content-type": "application/json", cookie: [...this.cookies].map(([key, value]) => key + "=" + value).join("; "), "x-csrf-token": this.cookies.get("vet_csrf") ?? "" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const separator = pair.indexOf("=");
      this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }
  async json<Data>(path: string, method = "GET", body?: unknown, status = 200): Promise<Data> {
    const response = await this.request(path, method, body);
    const text = await response.text();
    assert.equal(response.status, status, method + " " + path + ": " + text.slice(0, 500));
    return text ? JSON.parse(text) as Data : undefined as Data;
  }
}

async function proof(client: Client) {
  const challenge = await client.json<Challenge>("/api/auth/captcha");
  const solution = await solveChallenge({ challenge, deriveKey });
  assert.ok(solution);
  return Buffer.from(JSON.stringify({ challenge, solution })).toString("base64");
}

test("local authentication, role permissions, soft deletion, snapshots and audit work together", { skip: process.env.RUN_ACCOUNTS_INTEGRATION !== "1", timeout: 180000 }, async context => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Integration tests are local-only");
  const admin = new Client(), user = new Client(), stranger = new Client();
  const suffix = Date.now().toString(36);
  let userId = "", productId = "", rationId = "", nutrientId = "", itemId = "", managedId = "";
  try {
    await admin.json("/api/auth/login", "POST", { email: "ADMIN@VETENERGY.RU", password: "123456" });
    await stranger.json("/api/auth/login", "POST", { email: "user2@vetenergy.test", password: "123456" });
    await context.test("administrators create permanent credentials; role and password changes revoke sessions", async () => {
      const managed = await admin.json<{ id: string }>("/api/users", "POST", { name: "Managed QA " + suffix, email: "managed-" + suffix + "@vetenergy.test", password: "123456" }, 201);
      managedId = managed.id;
      const client = new Client();
      await client.json("/api/auth/login", "POST", { email: "managed-" + suffix + "@vetenergy.test", password: "123456" });
      await client.json("/api/auth/logout", "POST", undefined, 204);
      await client.json("/api/auth/login", "POST", { email: "managed-" + suffix + "@vetenergy.test", password: "123456" });
      await admin.json("/api/users/" + managedId, "PATCH", { name: "Updated QA", password: "654321", role: "ADMIN" });
      await client.json("/api/auth/me", "GET", undefined, 401);
      await client.json("/api/auth/login", "POST", { email: "managed-" + suffix + "@vetenergy.test", password: "123456" }, 401);
      await client.json("/api/auth/login", "POST", { email: "managed-" + suffix + "@vetenergy.test", password: "654321" });
      const users = await client.json<{ rows: unknown[]; per_page: number }>("/api/users?per_page=1");
      assert.equal(users.rows.length, 1);
      assert.equal(users.per_page, 1);
      await admin.json("/api/users/" + managedId, "PATCH", { role: "USER" });
      await client.json("/api/users", "GET", undefined, 401);
      await client.json("/api/auth/login", "POST", { email: "managed-" + suffix + "@vetenergy.test", password: "654321" });
      await client.json("/api/users", "GET", undefined, 403);
      const csrf = client.cookies.get("vet_csrf")!;
      client.cookies.set("vet_csrf", "invalid");
      await client.json("/api/rations", "POST", { name: "Forbidden" }, 403);
      client.cookies.set("vet_csrf", csrf);
    });
    await context.test("registration verifies a one-time captcha and cannot elevate the role", async () => {
      await user.json("/api/auth/register", "POST", { name: "QA " + suffix, email: "qa-" + suffix + "@vetenergy.test", password: "123456" }, 400);
      const captcha = await proof(user);
      const result = await user.json<{ user: { id: string; role: string } }>("/api/auth/register", "POST", { name: "QA " + suffix, email: "QA-" + suffix + "@vetenergy.test", password: "123456", role: "ADMIN", captcha }, 201);
      userId = result.user.id;
      assert.equal(result.user.role, "USER");
      await new Client().json("/api/auth/register", "POST", { name: "Replay", email: "replay-" + suffix + "@vetenergy.test", password: "123456", captcha }, 400);
      const duplicate = new Client();
      await duplicate.json("/api/auth/register", "POST", { name: "Duplicate", email: "qa-" + suffix + "@vetenergy.test", password: "123456", captcha: await proof(duplicate) }, 409);
      await user.json("/api/users", "GET", undefined, 403);
      await user.json("/api/audit", "GET", undefined, 403);
    });
    await context.test("only admins manage nutrients; users may specify product amounts", async () => {
      const nutrient = await admin.json<{ id: string }>("/api/workspace/nutrients", "POST", { name: "QA mineral " + suffix, code: "QA_" + suffix, category: "Тест", unit: "мг" }, 201);
      nutrientId = nutrient.id;
      await user.json("/api/workspace/nutrients", "POST", { name: "Forbidden", code: "QAX", category: "Тест", unit: "мг" }, 403);
      await user.json("/api/workspace/nutrients/" + nutrientId, "PATCH", { name: "Forbidden" }, 403);
      await user.json("/api/workspace/nutrients/" + nutrientId, "DELETE", undefined, 403);
      await user.json("/api/archive", "POST", { resource: "nutrients", key: { id: nutrientId } }, 403);
      const product = await user.json<{ id: string }>("/api/workspace/products", "POST", { name: "QA food " + suffix, kind: "PRODUCT", calories: 100, protein: 10, fat: 2, carbs: 5, nutrients: [{ nutrientId, amount: 0.004 }] }, 201);
      productId = product.id;
      await user.json("/api/products/" + productId + "/nutrients", "POST", { nutrientId, amount: 0.004 }, 409);
      await stranger.json("/api/workspace/products/" + productId, "DELETE", undefined, 404);
    });
    await context.test("source edits and soft deletion never change saved ration composition or Excel", async () => {
      const ration = await user.json<{ id: string }>("/api/rations", "POST", { name: "QA ration " + suffix, mode: "DAILY" }, 201);
      rationId = ration.id;
      await stranger.json("/api/rations/" + rationId, "GET", undefined, 404);
      await stranger.json("/api/rations/" + rationId, "PATCH", { name: "Forbidden" }, 404);
      await stranger.json("/api/rations/" + rationId + "/export", "GET", undefined, 404);
      const item = await user.json<{ id: string }>("/api/rations/" + rationId + "/items", "POST", { productId, quantity: 200 }, 201);
      itemId = item.id;
      const current = await admin.json<{ revision: number }>("/api/products/" + productId);
      await admin.json("/api/products/" + productId, "PATCH", { name: "Changed", kind: "PRODUCT", groupId: null, baseQuantity: 100, unit: "г", calories: 999, protein: 99, fat: 20, carbs: 50, archived: false, tagIds: [], nutrients: [{ nutrientId, amount: 999 }], expectedRevision: current.revision });
      await user.json("/api/products/" + productId + "/nutrients/" + nutrientId, "PATCH", { amount: 999 }, 409);
      await user.json("/api/workspace/products/" + productId, "DELETE", undefined, 204);
      const options = await user.json<{ value: string }[]>("/api/options/products?id=" + productId);
      assert.equal(options.length, 0);
      const saved = await user.json<{ items: { product: { calories: number; nutrients: { amount: number }[]; deletedAt: string } }[] }>("/api/rations/" + rationId);
      assert.equal(saved.items[0].product.calories, 100);
      assert.equal(saved.items[0].product.nutrients[0].amount, 0.004);
      assert.ok(saved.items[0].product.deletedAt);
      const card = await user.request("/products/" + productId);
      assert.equal(card.status, 200);
      assert.match(await card.text(), /Запись удалена/);
      await user.json("/api/rations/" + rationId + "/items/" + itemId, "PATCH", { quantity: 300 });
      const response = await admin.request("/api/rations/" + rationId + "/export");
      assert.equal(response.status, 200);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await response.arrayBuffer());
      assert.equal(workbook.getWorksheet("Рацион")!.getCell("J8").result, 300);
    });
    await context.test("owners restore their records; strangers cannot; audit does not contain credentials", async () => {
      await stranger.json("/api/archive", "POST", { resource: "products", key: { id: productId } }, 404);
      await user.json("/api/archive", "POST", { resource: "products", key: { id: productId } });
      await user.json("/api/rations/" + rationId + "/items/" + itemId, "DELETE", undefined, 204);
      const empty = await user.json<{ items: unknown[] }>("/api/rations/" + rationId);
      assert.equal(empty.items.length, 0);
      await admin.json("/api/archive", "POST", { resource: "items", key: { id: itemId } });
      const history = await admin.json<{ rows: Record<string, unknown>[] }>("/api/audit?search=" + productId);
      assert.ok(history.rows.some(row => row.action === "DELETE"));
      assert.ok(history.rows.some(row => row.action === "RESTORE"));
      assert.ok(!/passwordHash|csrfTokenHash|tokenHash/.test(JSON.stringify(history)));
      await admin.json("/api/users/bootstrap-admin", "DELETE", undefined, 409);
    });
    await context.test("deleted users lose existing sessions; restore retains the password and user data", async () => {
      await admin.json("/api/users/" + userId, "DELETE", undefined, 204);
      await user.json("/api/auth/me", "GET", undefined, 401);
      await new Client().json("/api/auth/login", "POST", { email: "qa-" + suffix + "@vetenergy.test", password: "123456" }, 401);
      await admin.json("/api/users", "POST", { name: "Duplicate deleted", email: "QA-" + suffix + "@vetenergy.test", password: "123456" }, 409);
      await admin.json("/api/users/" + userId, "PATCH", { restore: true });
      await user.json("/api/auth/login", "POST", { email: "qa-" + suffix + "@vetenergy.test", password: "123456" });
      await user.json("/api/rations/" + rationId);
    });
  } finally {
    if (rationId) await admin.request("/api/rations/" + rationId, "DELETE");
    if (productId) await admin.request("/api/workspace/products/" + productId, "DELETE");
    if (nutrientId) await admin.request("/api/workspace/nutrients/" + nutrientId, "DELETE");
    if (userId) await admin.request("/api/users/" + userId, "DELETE");
    if (managedId) await admin.request("/api/users/" + managedId, "DELETE");
  }
});
