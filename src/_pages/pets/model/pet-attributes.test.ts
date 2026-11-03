import assert from "node:assert/strict";
import test from "node:test";
import type { Pet } from "@/entities/pet";
import { changePetWeight, petAttributesDraft, petAttributesPayload } from "./pet-attributes";

const pet: Pet = {
  id: "pet-1", name: "Нора", species: "DOG", sex: "FEMALE", breedId: null, breed: null,
  customerId: "customer-1", customer: { id: "customer-1", name: "Клиент" },
  actualWeight: 12, idealWeight: 10, bcs: 6, note: "Заметка",
};

test("attribute drafts preserve saved BCS and notes without including the owner", () => {
  const payload = petAttributesPayload(petAttributesDraft(pet));
  assert.equal(payload.bcs, 6);
  assert.equal(payload.note, pet.note);
  assert.equal(payload.sex, pet.sex);
  assert.equal(payload.name, pet.name);
  assert.equal("customerId" in payload, false);
  assert.equal("id" in payload, false);
});

test("weight edits recalculate BCS without mutating the saved draft", () => {
  const draft = petAttributesDraft(pet);
  const heavier = changePetWeight(draft, "actualWeight", "14");
  assert.equal(heavier.bcs, "9");
  assert.equal(draft.actualWeight, "12");
  assert.equal(draft.bcs, "6");
  assert.equal(changePetWeight(heavier, "idealWeight", "14").bcs, "5");
});

test("incomplete or invalid weights do not replace BCS", () => {
  const draft = petAttributesDraft(pet);
  for (const value of ["", "0", "-1", "invalid", "Infinity"]) {
    assert.equal(changePetWeight(draft, "idealWeight", value).bcs, draft.bcs);
  }
});

test("saving trims text, clears optional fields and keeps manually adjusted BCS", () => {
  const draft = { ...petAttributesDraft(pet), name: "  Нора  ", sex: "", breedId: "", note: "  ", bcs: "4" };
  const payload = petAttributesPayload(draft);
  assert.equal(payload.name, "Нора");
  assert.equal(payload.sex, null);
  assert.equal(payload.breedId, null);
  assert.equal(payload.note, null);
  assert.equal(payload.bcs, 4);
});
