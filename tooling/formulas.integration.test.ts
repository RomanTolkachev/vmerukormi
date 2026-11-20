import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const base = process.env.FORMULAS_TEST_URL ?? "http://127.0.0.1:3000";
class Client {
  cookies = new Map<string, string>();
  async request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(base + path, { method, headers: { origin: base, "content-type": "application/json", cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "), "x-csrf-token": this.cookies.get("vet_csrf") ?? "" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0]; const separator = pair.indexOf("="); this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1)); }
    return response;
  }
  async json<Value>(path: string, method = "GET", body?: unknown, status = 200): Promise<Value> {
    const response = await this.request(path, method, body), content = await response.text();
    assert.equal(response.status, status, `${method} ${path}: ${content.slice(0, 500)}`);
    return content ? JSON.parse(content) as Value : undefined as Value;
  }
}
type Calculation = { id: string; name: string; baseEnergy: number; adjustedEnergy: number; lactationWeek: number | null; formulaSnapshot: { coefficients: Record<string, number> }; variables: Record<string, number> };
test("fixed formulas, calculation isolation, soft deletion and preserved ration targets", { skip: process.env.RUN_FORMULAS_INTEGRATION !== "1", timeout: 180000 }, async context => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const databaseUrl = process.env.FORMULAS_TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/vet_calorie";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname));
  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const admin = new Client(), owner = new Client(), stranger = new Client();
  const suffix = Date.now().toString(36), users: string[] = [], calculations: string[] = [], pets: string[] = [], rations: string[] = [];
  const saved = async (client: Client, payload: Record<string, unknown>) => { const row = await client.json<Calculation>("/api/calculations", "POST", { ...payload, save: true }, 201); calculations.push(row.id); return row; };
  try {
    await admin.json("/api/auth/login", "POST", { email: "admin@vetenergy.ru", password: "123456" });
    for (const [index, client] of [owner, stranger].entries()) {
      const email = `formulas-${suffix}-${index}@vetenergy.test`;
      const user = await admin.json<{ id: string }>("/api/users", "POST", { name: `Formulas QA ${suffix} ${index}`, email, password: "Formula123456" }, 201);
      users.push(user.id); await client.json("/api/auth/login", "POST", { email, password: "Formula123456" });
    }
    const pet = await owner.json<{ id: string }>("/api/pets", "POST", { name: `Барсик QA ${suffix}`, species: "CAT", sex: "MALE", actualWeight: 5, idealWeight: 5, bcs: 5 }, 201); pets.push(pet.id);
    const choices = await owner.json<{ value: string; data: { versions: { id: string }[] } }[]>("/api/options/modules?species=CAT");
    assert.equal(choices.length, 5); assert.ok(choices.every(choice => choice.value.startsWith("cat-")));
    const version = (key: string) => choices.find(choice => choice.value === key)!.data.versions[0].id;
    const adult = { name: `Расчёт QA ${suffix}`, petId: pet.id, moduleId: "cat-adult", species: "CAT", expectedVersionId: version("cat-adult"), parameters: { IW: 5 } };
    await context.test("only template selection and numeric changes are allowed, including for admin", async () => {
      for (const client of [admin, owner]) {
        await client.json("/api/modules", "POST", { name: "Forbidden", formula: "IW" }, 403);
        await client.json("/api/modules/cat-adult", "PATCH", { name: "Forbidden" }, 403);
        await client.json("/api/modules/cat-adult/versions", "POST", { formula: "IW" }, 403);
      }
      await owner.json("/api/calculations", "POST", { ...adult, formula: "999 * IW", save: false }, 400);
      await owner.json("/api/calculations", "POST", { ...adult, coefficients: { C1: "IW+1" }, save: false }, 400);
      await owner.json("/api/calculations", "POST", { ...adult, moduleId: "dog-adult", save: false }, 404);
      await owner.json("/api/calculations", "POST", { ...adult, expectedVersionId: "obsolete", save: false }, 409);
      await stranger.json("/api/calculations", "POST", { ...adult, save: false }, 404);
    });
    await context.test("adult and pregnancy calculations never require lactation or pregnancy week", async () => {
      const preview = await owner.json<Calculation>("/api/calculations", "POST", { ...adult, parameters: { IW: 5, LACTATION_WEEK: "" }, save: false });
      assert.equal(preview.baseEnergy, Math.round(100 * 5 ** 0.67));
      const pregnancy = await owner.json<Calculation>("/api/calculations", "POST", { ...adult, moduleId: "cat-pregnancy", expectedVersionId: version("cat-pregnancy"), save: false });
      assert.equal(pregnancy.baseEnergy, Math.round(140 * 5 ** 0.67));
      await owner.json("/api/calculations", "POST", { ...adult, parameters: {}, save: false }, 400);
      await owner.json("/api/calculations", "POST", { ...adult, parameters: { IW: 5, PREGNANCY_WEEK: 2 }, save: false }, 400);
    });
    await context.test("lactation requires relevant inputs, supports manual coefficients, and does not restrict sex", async () => {
      const input = { ...adult, moduleId: "cat-lactation", expectedVersionId: version("cat-lactation"), save: false };
      const missing = await owner.json<{ error: string }>("/api/calculations", "POST", input, 400); assert.match(missing.error, /Количество детёнышей/);
      await owner.json("/api/calculations", "POST", { ...input, parameters: { IW: 5, LACTATION_WEEK: 0, CHILDREN: 3 } }, 400);
      const automatic = await owner.json<Calculation>("/api/calculations", "POST", { ...input, parameters: { IW: 5, LACTATION_WEEK: 3, CHILDREN: 4 } });
      assert.equal(automatic.variables.K, 60); assert.equal(automatic.variables.L, 1.2);
      const manual = await owner.json<Calculation>("/api/calculations", "POST", { ...input, parameters: { IW: 5, K: 0, L: 1 } });
      assert.equal(manual.variables.K, 0);
    });
    let calculation: Calculation;
    await context.test("coefficient changes are snapshotted only in the new calculation", async () => {
      calculation = await saved(owner, { ...adult, coefficients: { C1: 120, C2: 2 } });
      assert.equal(calculation.baseEnergy, 3000); assert.equal(calculation.lactationWeek, null);
      assert.deepEqual(calculation.formulaSnapshot.coefficients, { C1: 120, C2: 2 });
      const fresh = await owner.json<Calculation>("/api/calculations", "POST", { ...adult, save: false });
      assert.equal(fresh.baseEnergy, Math.round(100 * 5 ** 0.67));
      const current = await database.moduleFormulaVersion.findUniqueOrThrow({ where: { id: adult.expectedVersionId } });
      assert.equal(current.formula, "100 * IW ^ 0.67");
    });
    await context.test("active names are unique per dietitian, normalized and protected against races", async () => {
      await owner.json("/api/calculations", "POST", { ...adult, name: `  ${adult.name.toUpperCase().replaceAll(" ", "   ")}  `, save: true }, 409);
      await saved(stranger, { ...adult, petId: null });
      const body = { ...adult, name: `Одновременный ${suffix}`, save: true };
      const race = await Promise.all([owner.request("/api/calculations", "POST", body), owner.request("/api/calculations", "POST", body)]);
      assert.deepEqual(race.map(response => response.status).sort(), [201, 409]);
      for (const response of race) if (response.status === 201) calculations.push((await response.json()).id);
    });
    await context.test("deleted calculations remain in rations, leave options and can be restored unless name reused", async () => {
      const ration = await owner.json<{ id: string; targetEnergy: number }>("/api/rations", "POST", { name: `Рацион QA ${suffix}`, calculationId: calculation!.id }, 201); rations.push(ration.id);
      assert.equal(ration.targetEnergy, 3000);
      await stranger.json(`/api/calculations/${calculation!.id}`, "DELETE", undefined, 404);
      await owner.json(`/api/calculations/${calculation!.id}`, "DELETE", undefined, 204);
      const deleted = await database.calculation.findUniqueOrThrow({ where: { id: calculation!.id } });
      assert.equal(deleted.deletedAt?.toISOString(), deleted.busEnd?.toISOString());
      assert.equal(deleted.adjustedEnergy, 3000);
      assert.deepEqual(await owner.json(`/api/options/calculations?id=${calculation!.id}`), []);
      const retained = await owner.json<{ calculationId: string; targetEnergy: number }>(`/api/rations/${ration.id}`);
      assert.equal(retained.calculationId, calculation!.id); assert.equal(retained.targetEnergy, 3000);
      const edited = await owner.json<{ calculation: { adjustedEnergy: number } }>(`/api/rations/${ration.id}`, "PATCH", { name: `Рацион изменён ${suffix}`, calculationId: calculation!.id });
      assert.equal(edited.calculation.adjustedEnergy, 3000);
      await owner.json("/api/rations", "POST", { name: "Cannot attach deleted", calculationId: calculation!.id }, 404);
      const exported = await owner.request(`/api/rations/${ration.id}/export`); assert.equal(exported.status, 200);
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await exported.arrayBuffer());
      assert.ok(workbook.getWorksheet("Рацион"));
      const reused = await saved(owner, adult);
      await owner.json("/api/archive", "POST", { resource: "calculations", key: { id: calculation!.id } }, 409);
      await owner.json(`/api/calculations/${reused.id}`, "DELETE", undefined, 204);
      await owner.json("/api/archive", "POST", { resource: "calculations", key: { id: calculation!.id } });
      assert.equal((await database.calculation.findUniqueOrThrow({ where: { id: calculation!.id } })).busEnd, null);
      await owner.json(`/api/rations/${ration.id}`, "DELETE", undefined, 204);
      const removedRation = await database.ration.findUniqueOrThrow({ where: { id: ration.id } });
      assert.equal(removedRation.busEnd?.toISOString(), removedRation.deletedAt?.toISOString());
    });
  } finally {
    for (const id of rations) await admin.request(`/api/rations/${id}`, "DELETE");
    for (const id of calculations) await admin.request(`/api/calculations/${id}`, "DELETE");
    for (const id of pets) await admin.request(`/api/pets/${id}`, "DELETE");
    for (const id of users) await admin.request(`/api/users/${id}`, "DELETE");
    await database.$disconnect();
  }
});
