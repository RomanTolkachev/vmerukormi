import assert from "node:assert/strict";
import test from "node:test";
import { ownerScope, normalizeEmail, canManageNutrients } from "./policy";
import { accountSchema } from "./validation";
import { redactAudit } from "../audit/redact";

test("roles isolate users and reserve nutrient management for administrators", () => {
  assert.deepEqual(ownerScope({ id: "alice", role: "USER" }), { userId: "alice" });
  assert.deepEqual(ownerScope({ id: "admin", role: "ADMIN" }), {});
  assert.equal(canManageNutrients({ id: "alice", role: "USER" }), false);
  assert.equal(canManageNutrients({ id: "admin", role: "ADMIN" }), true);
});

test("email normalization and password validation preserve deliberate simple test passwords", () => {
  assert.equal(normalizeEmail(" User@Example.TEST "), "user@example.test");
  assert.equal(accountSchema.safeParse({ name: "Тест", email: "invalid", password: "123456" }).success, false);
  assert.equal(accountSchema.safeParse({ name: "Тест", email: "USER@example.test", password: "123456" }).success, true);
});

test("audit excludes secrets at every nesting level", () => {
  assert.deepEqual(redactAudit({ email: "test@example.test", password: "123456", nested: [{ passwordHash: "hash", csrfToken: "token", secret: "key", name: "Тест" }] }), { email: "test@example.test", nested: [{ name: "Тест" }] });
});
