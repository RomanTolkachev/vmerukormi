import assert from "node:assert/strict";
import test from "node:test";
import { changeRationCustomer, changeRationPet, rationFormDefaults, rationFormPayload } from "./ration-form";

test("creation and editing use the same defaults and retain saved zero targets", () => {
  assert.deepEqual(rationFormPayload(rationFormDefaults()), {
    name: "", petId: null, calculationId: null, mode: "DAILY", targetEnergy: undefined, tolerancePercent: 10, note: null,
  });
  const values = rationFormDefaults({ name: "Рацион", mode: "WEEKLY", targetEnergy: 0, tolerancePercent: 0 });
  assert.equal(values.mode, "WEEKLY");
  assert.equal(rationFormPayload(values).targetEnergy, 0);
  assert.equal(rationFormPayload(values).tolerancePercent, 0);
});

test("changing the owner clears dependent choices without losing other fields", () => {
  const original = rationFormDefaults({ name: "Рацион", customerId: "old", petId: "pet", calculationId: "calculation", targetEnergy: 600, note: "Заметка" });
  const changed = changeRationCustomer(original, "new");
  assert.deepEqual([changed.customerId, changed.petId, changed.calculationId, changed.targetEnergy], ["new", "", "", ""]);
  assert.equal(changed.note, original.note);
  assert.equal(original.petId, "pet");
});

test("changing the pet updates its owner and clears the old calculation", () => {
  const original = rationFormDefaults({ customerId: "old", petId: "old-pet", calculationId: "old-calculation", targetEnergy: 600 });
  const changed = changeRationPet(original, "new-pet", "new-owner");
  assert.deepEqual([changed.customerId, changed.petId, changed.calculationId, changed.targetEnergy], ["new-owner", "new-pet", "", ""]);
  assert.equal(changeRationPet(changed, "").customerId, "new-owner");
});

test("the save payload includes only general attributes, never food items or owner references", () => {
  const original = { id: "ration", name: "  Рацион  ", customerId: "owner", items: [{ productId: "product", quantity: 100 }], note: "  " };
  const values = rationFormDefaults(original);
  values.targetEnergy = "350.5";
  const payload = rationFormPayload(values);
  assert.equal(payload.name, "Рацион");
  assert.equal(payload.targetEnergy, 350.5);
  assert.equal(payload.note, null);
  assert.equal("items" in payload, false);
  assert.equal("customerId" in payload, false);
  assert.equal("id" in payload, false);
  assert.deepEqual(original.items, [{ productId: "product", quantity: 100 }]);
});
