import assert from "node:assert/strict";
import test from "node:test";
import { canEditCatalog, catalogReferences, readableCatalog, writableCatalog } from "./access";
import { catalogDefault, uniqueCatalogNutrients } from "./nutrients";

test("shared records are readable but not writable by regular users, even the owner", () => {
  const user = { id: "alice", role: "USER" };
  assert.deepEqual(readableCatalog(user.id), { OR: [{ userId: "alice" }, { isShared: true }] });
  assert.equal(canEditCatalog({ userId: "alice", isShared: true }, user), false);
  assert.deepEqual(writableCatalog(user), { OR: [{ userId: "alice", isShared: false }] });
  assert.equal(canEditCatalog({ userId: "alice", isShared: false }, user), true);
  assert.equal(canEditCatalog({ userId: "bob", isShared: false }, user), false);
});

test("admin can edit shared catalog, not other users' private records", () => {
  const admin = { id: "admin", role: "ADMIN" };
  assert.equal(canEditCatalog({ userId: "alice", isShared: true }, admin), true);
  assert.equal(canEditCatalog({ userId: "alice", isShared: false }, admin), false);
  assert.deepEqual(catalogReferences("admin", true), { isShared: true });
  assert.deepEqual(catalogReferences("alice", false), readableCatalog("alice"));
});

test("deduplicates standard identities while preserving explicit overrides and units", () => {
  const base = { code: "Ca", unit: "мг", id: "shared", isShared: true };
  const own = { ...base, id: "own", isShared: false };
  assert.deepEqual(uniqueCatalogNutrients([own, base]), [base]);
  assert.deepEqual(uniqueCatalogNutrients([own, base], new Set(["own"])), [own]);
  assert.equal(uniqueCatalogNutrients([own, { ...base, unit: "г" }]).length, 2);
  assert.equal(catalogDefault({ code: "Ca", unit: "г" }, { Ca: 1000 }), undefined);
  assert.equal(catalogDefault(base, { Ca: 1000 }), 1000);
});
