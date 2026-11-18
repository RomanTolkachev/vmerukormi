import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../backend/database/prisma/migrations/20261118120000_bootstrap_reference_data/migration.sql", import.meta.url), "utf8");

function definitions(marker: string): Record<string, unknown>[] {
  const sections = migration.split(`$${marker}$`);
  assert.equal(sections.length, 3);
  return JSON.parse(sections[1]);
}

test("fresh installations receive the base formulas and breed catalog without demo users or pets", () => {
  const modules = definitions("modules");
  const breeds = definitions("breeds");
  assert.equal(modules.length, 13);
  assert.equal(breeds.length, 243);
  assert.equal(new Set(modules.map((module) => module.id)).size, modules.length);
  assert.equal(new Set(breeds.map((breed) => breed.id)).size, breeds.length);
  assert.equal(modules.find((module) => module.id === "dog-adult")?.formula, "100 * IW ^ 0.75");
  assert.ok(breeds.every((breed) => ["CAT", "DOG"].includes(String(breed.species))));
  assert.doesNotMatch(migration, /INSERT INTO "(?:User|Pet|Customer|Ration)"/);
});

test("reference initialization preserves existing, archived and soft-deleted records", () => {
  assert.match(migration, /ON CONFLICT DO NOTHING\s+RETURNING "id"/);
  assert.match(migration, /JOIN inserted ON inserted\."id" = definition\."id"/);
  assert.match(migration, /ON CONFLICT \("id"\) DO NOTHING/);
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE|TRUNCATE)\b/i);
  assert.match(migration, /^BEGIN;[\s\S]+COMMIT;\s*$/);
});
