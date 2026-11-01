import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { referenceNutrients } from "../../../../domain/catalog/nutrient-conventions";

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const aliases = [
  ["D3", "D", "МЕ", 1, 1],
  ["D3_MCG", "D", "мкг", 40, 2],
  ["Retinol", "A", "мг", 1000 / 0.3, 1],
  ["Retinol", "A", "мкг", 1 / 0.3, 1],
  ["E_MG", "E", "мг", 1.49, 1],
  ["HD_16488ea6cebf", "B3", "мг", 1, 1],
  ["HD_064d304bc0ee", "B7", "мкг", 1, 1],
  ["HD_bfbeb125bba6", "Cl", "мг", 1, 1],
  ["HD_e34d6779b3f1", "Arg", "г", 1, 1],
  ["HD_0a1ba7b0a603", "Cys", "г", 1, 1],
  ["HD_80031258efb9", "His", "г", 1, 1],
  ["HD_88351dba2c51", "Ile", "г", 1, 1],
  ["HD_e8b02c4d7b84", "Leu", "г", 1, 1],
  ["HD_48df922698c4", "Lys", "г", 1, 1],
  ["HD_b0b30e6962f2", "Met", "г", 1, 1],
  ["HD_fcc3378024f8", "Phe", "г", 1, 1],
  ["HD_2b5b97d49fb7", "Thr", "г", 1, 1],
  ["HD_214e3b9b8e4d", "Trp", "г", 1, 1],
  ["HD_b619c59367f7", "Tyr", "г", 1, 1],
  ["HD_61782fa18676", "Val", "г", 1, 1],
  ["HD_2e907cd1df3f", "LA", "г", 1, 1],
  ["HD_f658a18cc3c3", "AA", "г", 1, 1],
  ["HD_0da6abd07072", "EPA", "г", 1, 1],
  ["HD_24f2ff8159e0", "DHA", "г", 1, 1],
] as const;

export function generateReferenceMigration() {
  const units: Record<string, number> = { "г": 1, "мг": 0.001, "мкг": 0.000001 };
  const rules: (readonly [string, string, string, number, number])[] = [...aliases];
  for (const nutrient of referenceNutrients) {
    rules.push([nutrient.code, nutrient.code, nutrient.unit, 1, 0]);
    if (units[nutrient.unit]) {
      for (const [unit, mass] of Object.entries(units)) {
        if (unit !== nutrient.unit) rules.push([nutrient.code, nutrient.code, unit, Number((mass / units[nutrient.unit]).toPrecision(12)), 0]);
      }
    }
  }
  rules.push(["D", "D", "мкг", 40, 0], ["D", "D", "мг", 40000, 0]);
  const definitions = referenceNutrients.map(({ code, name, unit, category }) => `(${[code, name, unit, category].map(quote).join(", ")})`).join(",\n");
  const conversions = rules.map(([source, target, unit, factor, priority]) => `(${quote(source)}, ${quote(target)}, ${quote(unit)}, ${factor}, ${priority})`).join(",\n");
  return `BEGIN;
ALTER TABLE "Nutrient" ADD COLUMN "isReferenceOnly" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Nutrient" SET "code" = 'E_MG', "isReferenceOnly" = true WHERE "code" = 'E' AND "unit" = 'мг';

CREATE TEMP TABLE reference_definitions (code TEXT PRIMARY KEY, name TEXT, unit TEXT, category TEXT) ON COMMIT DROP;
INSERT INTO reference_definitions VALUES
${definitions};
CREATE TEMP TABLE reference_rules (source_code TEXT, target_code TEXT, source_unit TEXT, factor DOUBLE PRECISION, priority INTEGER) ON COMMIT DROP;
INSERT INTO reference_rules VALUES
${conversions};

INSERT INTO "Nutrient" ("id", "code", "name", "unit", "category", "userId", "isShared")
SELECT DISTINCT ON (owners.user_id, definitions.code) 'reference-' || md5(owners.user_id || '|' || definitions.code), definitions.code, definitions.name, definitions.unit, definitions.category, owners.user_id, owners.shared
FROM reference_definitions definitions
JOIN (
  SELECT 'bootstrap-admin' AS user_id, true AS shared, code FROM reference_definitions
  UNION
  SELECT source."userId", bool_or(source."isShared"), rules.target_code
  FROM "Nutrient" source JOIN reference_rules rules ON rules.source_code = source."code" AND rules.source_unit = source."unit"
  GROUP BY source."userId", rules.target_code
) owners ON owners.code = definitions.code
ORDER BY owners.user_id, definitions.code, owners.shared DESC
ON CONFLICT ("userId", "code") DO UPDATE SET "isShared" = "Nutrient"."isShared" OR EXCLUDED."isShared";

CREATE TEMP TABLE reference_mapping ON COMMIT DROP AS
SELECT source."id" AS source_id, target."id" AS target_id, rules.factor, rules.priority,
  source."code" = 'E_MG' AND source."name" NOT ILIKE '%альфа%токоферол%' AS uncertain_e
FROM reference_rules rules
JOIN "Nutrient" source ON source."code" = rules.source_code AND source."unit" = rules.source_unit
JOIN "Nutrient" target ON target."userId" = source."userId" AND target."code" = rules.target_code
JOIN reference_definitions definitions ON definitions.code = rules.target_code
WHERE target."unit" = definitions.unit OR EXISTS (
  SELECT 1 FROM reference_rules own_rule WHERE own_rule.source_code = target."code" AND own_rule.target_code = target."code" AND own_rule.source_unit = target."unit"
);

UPDATE "ProductNutrient" value SET "amount" = value."amount" * mapping.factor
FROM reference_mapping mapping WHERE value."nutrientId" = mapping.source_id AND mapping.source_id = mapping.target_id;
UPDATE "CalculationNutrient" value SET "targetAmount" = value."targetAmount" * mapping.factor
FROM reference_mapping mapping WHERE value."nutrientId" = mapping.source_id AND mapping.source_id = mapping.target_id;
UPDATE "BreedStandardNutrient" value SET "amountPer1000Kcal" = value."amountPer1000Kcal" * mapping.factor
FROM reference_mapping mapping WHERE value."nutrientId" = mapping.source_id AND mapping.source_id = mapping.target_id;

INSERT INTO "ProductNutrient" ("productId", "nutrientId", "amount")
SELECT DISTINCT ON (value."productId", mapping.target_id) value."productId", mapping.target_id, value."amount" * mapping.factor
FROM "ProductNutrient" value JOIN reference_mapping mapping ON mapping.source_id = value."nutrientId"
JOIN "Product" product ON product."id" = value."productId"
WHERE mapping.source_id <> mapping.target_id AND value."amount" IS NOT NULL
  AND (NOT mapping.uncertain_e OR product."source" IN ('health-diet', 'USDA FoodData Central SR Legacy'))
ORDER BY value."productId", mapping.target_id, mapping.priority, mapping.source_id
ON CONFLICT ("productId", "nutrientId") DO UPDATE SET "amount" = EXCLUDED."amount" WHERE "ProductNutrient"."amount" IS NULL;

INSERT INTO "CalculationNutrient" ("calculationId", "nutrientId", "targetAmount")
SELECT DISTINCT ON (value."calculationId", mapping.target_id) value."calculationId", mapping.target_id, value."targetAmount" * mapping.factor
FROM "CalculationNutrient" value JOIN reference_mapping mapping ON mapping.source_id = value."nutrientId"
WHERE mapping.source_id <> mapping.target_id AND NOT mapping.uncertain_e
ORDER BY value."calculationId", mapping.target_id, mapping.priority, mapping.source_id
ON CONFLICT DO NOTHING;

INSERT INTO "BreedStandardNutrient" ("standardId", "nutrientId", "amountPer1000Kcal")
SELECT DISTINCT ON (value."standardId", mapping.target_id) value."standardId", mapping.target_id, value."amountPer1000Kcal" * mapping.factor
FROM "BreedStandardNutrient" value JOIN reference_mapping mapping ON mapping.source_id = value."nutrientId"
WHERE mapping.source_id <> mapping.target_id AND NOT mapping.uncertain_e
ORDER BY value."standardId", mapping.target_id, mapping.priority, mapping.source_id
ON CONFLICT DO NOTHING;

UPDATE "Nutrient" nutrient SET "name" = definitions.name, "category" = definitions.category, "unit" = definitions.unit
FROM reference_definitions definitions, reference_mapping mapping
WHERE nutrient."id" = mapping.target_id AND nutrient."code" = definitions.code;

UPDATE "Nutrient" SET "isReferenceOnly" = true
WHERE "id" IN (SELECT source_id FROM reference_mapping WHERE source_id <> target_id)
   OR "code" IN ('A_RE', 'E_MG');
COMMIT;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sql = generateReferenceMigration();
  if (process.argv.includes("--check")) {
    const saved = readFileSync(new URL("../../migrations/20261031090000_reference_nutrients/migration.sql", import.meta.url), "utf8");
    if (saved !== sql) throw new Error("Миграция не соответствует правилам нормализации");
  } else process.stdout.write(sql);
}
