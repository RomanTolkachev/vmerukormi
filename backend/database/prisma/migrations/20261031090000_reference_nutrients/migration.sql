BEGIN;
ALTER TABLE "Nutrient" ADD COLUMN "isReferenceOnly" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Nutrient" SET "code" = 'E_MG', "isReferenceOnly" = true WHERE "code" = 'E' AND "unit" = 'мг';

CREATE TEMP TABLE reference_definitions (code TEXT PRIMARY KEY, name TEXT, unit TEXT, category TEXT) ON COMMIT DROP;
INSERT INTO reference_definitions VALUES
('Energy', 'Калорийность', 'ккал', 'Основные'),
('CP', 'Белок', 'г', 'Основные'),
('CFa', 'Жир', 'г', 'Основные'),
('CH', 'Углеводы', 'г', 'Основные'),
('MO', 'Влага', 'г', 'Основные'),
('CFi', 'Сырая клетчатка', 'г', 'Основные'),
('CAs', 'Зола', 'г', 'Основные'),
('Ca', 'Кальций', 'мг', 'Минералы'),
('P', 'Фосфор', 'мг', 'Минералы'),
('Mg', 'Магний', 'мг', 'Минералы'),
('Na', 'Натрий', 'мг', 'Минералы'),
('K', 'Калий', 'мг', 'Минералы'),
('Cl', 'Хлор', 'мг', 'Минералы'),
('Fe', 'Железо', 'мг', 'Минералы'),
('Cu', 'Медь', 'мг', 'Минералы'),
('Zn', 'Цинк', 'мг', 'Минералы'),
('Mn', 'Марганец', 'мг', 'Минералы'),
('Se', 'Селен', 'мкг', 'Минералы'),
('J', 'Йод', 'мкг', 'Минералы'),
('A', 'Витамин A', 'МЕ', 'Витамины'),
('D', 'Витамин D', 'МЕ', 'Витамины'),
('E', 'Витамин E', 'МЕ', 'Витамины'),
('B1', 'Витамин B1', 'мг', 'Витамины'),
('B2', 'Витамин B2', 'мг', 'Витамины'),
('B3', 'Витамин B3', 'мг', 'Витамины'),
('B4', 'Витамин B4', 'мг', 'Витамины'),
('B5', 'Витамин B5', 'мг', 'Витамины'),
('B6', 'Витамин B6', 'мг', 'Витамины'),
('B7', 'Витамин B7', 'мкг', 'Витамины'),
('B9', 'Витамин B9', 'мкг', 'Витамины'),
('B12', 'Витамин B12', 'мкг', 'Витамины'),
('C', 'Витамин C', 'мг', 'Витамины'),
('Carotene', 'Бета-каротин', 'мг', 'Витамины'),
('Arg', 'Аргинин', 'г', 'Аминокислоты'),
('Cys', 'Цистеин', 'г', 'Аминокислоты'),
('His', 'Гистидин', 'г', 'Аминокислоты'),
('Ile', 'Изолейцин', 'г', 'Аминокислоты'),
('Leu', 'Лейцин', 'г', 'Аминокислоты'),
('Lys', 'Лизин', 'г', 'Аминокислоты'),
('Met', 'Метионин', 'г', 'Аминокислоты'),
('Phe', 'Фенилаланин', 'г', 'Аминокислоты'),
('Tau', 'Таурин', 'г', 'Аминокислоты'),
('Thr', 'Треонин', 'г', 'Аминокислоты'),
('Trp', 'Триптофан', 'г', 'Аминокислоты'),
('Tyr', 'Тирозин', 'г', 'Аминокислоты'),
('Val', 'Валин', 'г', 'Аминокислоты'),
('LA', 'Линолевая кислота', 'г', 'Жирные кислоты'),
('ALA', 'Альфа-линоленовая кислота', 'г', 'Жирные кислоты'),
('AA', 'Арахидоновая кислота', 'г', 'Жирные кислоты'),
('EPA', 'Эйкозапентаеновая кислота', 'г', 'Жирные кислоты'),
('DHA', 'Докозагексаеновая кислота', 'г', 'Жирные кислоты'),
('O3', 'Омега-3', 'г', 'Жирные кислоты'),
('O6', 'Омега-6', 'г', 'Жирные кислоты');
CREATE TEMP TABLE reference_rules (source_code TEXT, target_code TEXT, source_unit TEXT, factor DOUBLE PRECISION, priority INTEGER) ON COMMIT DROP;
INSERT INTO reference_rules VALUES
('D3', 'D', 'МЕ', 1, 1),
('D3_MCG', 'D', 'мкг', 40, 2),
('Retinol', 'A', 'мг', 3333.3333333333335, 1),
('Retinol', 'A', 'мкг', 3.3333333333333335, 1),
('E_MG', 'E', 'мг', 1.49, 1),
('HD_16488ea6cebf', 'B3', 'мг', 1, 1),
('HD_064d304bc0ee', 'B7', 'мкг', 1, 1),
('HD_bfbeb125bba6', 'Cl', 'мг', 1, 1),
('HD_e34d6779b3f1', 'Arg', 'г', 1, 1),
('HD_0a1ba7b0a603', 'Cys', 'г', 1, 1),
('HD_80031258efb9', 'His', 'г', 1, 1),
('HD_88351dba2c51', 'Ile', 'г', 1, 1),
('HD_e8b02c4d7b84', 'Leu', 'г', 1, 1),
('HD_48df922698c4', 'Lys', 'г', 1, 1),
('HD_b0b30e6962f2', 'Met', 'г', 1, 1),
('HD_fcc3378024f8', 'Phe', 'г', 1, 1),
('HD_2b5b97d49fb7', 'Thr', 'г', 1, 1),
('HD_214e3b9b8e4d', 'Trp', 'г', 1, 1),
('HD_b619c59367f7', 'Tyr', 'г', 1, 1),
('HD_61782fa18676', 'Val', 'г', 1, 1),
('HD_2e907cd1df3f', 'LA', 'г', 1, 1),
('HD_f658a18cc3c3', 'AA', 'г', 1, 1),
('HD_0da6abd07072', 'EPA', 'г', 1, 1),
('HD_24f2ff8159e0', 'DHA', 'г', 1, 1),
('Energy', 'Energy', 'ккал', 1, 0),
('CP', 'CP', 'г', 1, 0),
('CP', 'CP', 'мг', 0.001, 0),
('CP', 'CP', 'мкг', 0.000001, 0),
('CFa', 'CFa', 'г', 1, 0),
('CFa', 'CFa', 'мг', 0.001, 0),
('CFa', 'CFa', 'мкг', 0.000001, 0),
('CH', 'CH', 'г', 1, 0),
('CH', 'CH', 'мг', 0.001, 0),
('CH', 'CH', 'мкг', 0.000001, 0),
('MO', 'MO', 'г', 1, 0),
('MO', 'MO', 'мг', 0.001, 0),
('MO', 'MO', 'мкг', 0.000001, 0),
('CFi', 'CFi', 'г', 1, 0),
('CFi', 'CFi', 'мг', 0.001, 0),
('CFi', 'CFi', 'мкг', 0.000001, 0),
('CAs', 'CAs', 'г', 1, 0),
('CAs', 'CAs', 'мг', 0.001, 0),
('CAs', 'CAs', 'мкг', 0.000001, 0),
('Ca', 'Ca', 'мг', 1, 0),
('Ca', 'Ca', 'г', 1000, 0),
('Ca', 'Ca', 'мкг', 0.001, 0),
('P', 'P', 'мг', 1, 0),
('P', 'P', 'г', 1000, 0),
('P', 'P', 'мкг', 0.001, 0),
('Mg', 'Mg', 'мг', 1, 0),
('Mg', 'Mg', 'г', 1000, 0),
('Mg', 'Mg', 'мкг', 0.001, 0),
('Na', 'Na', 'мг', 1, 0),
('Na', 'Na', 'г', 1000, 0),
('Na', 'Na', 'мкг', 0.001, 0),
('K', 'K', 'мг', 1, 0),
('K', 'K', 'г', 1000, 0),
('K', 'K', 'мкг', 0.001, 0),
('Cl', 'Cl', 'мг', 1, 0),
('Cl', 'Cl', 'г', 1000, 0),
('Cl', 'Cl', 'мкг', 0.001, 0),
('Fe', 'Fe', 'мг', 1, 0),
('Fe', 'Fe', 'г', 1000, 0),
('Fe', 'Fe', 'мкг', 0.001, 0),
('Cu', 'Cu', 'мг', 1, 0),
('Cu', 'Cu', 'г', 1000, 0),
('Cu', 'Cu', 'мкг', 0.001, 0),
('Zn', 'Zn', 'мг', 1, 0),
('Zn', 'Zn', 'г', 1000, 0),
('Zn', 'Zn', 'мкг', 0.001, 0),
('Mn', 'Mn', 'мг', 1, 0),
('Mn', 'Mn', 'г', 1000, 0),
('Mn', 'Mn', 'мкг', 0.001, 0),
('Se', 'Se', 'мкг', 1, 0),
('Se', 'Se', 'г', 1000000, 0),
('Se', 'Se', 'мг', 1000, 0),
('J', 'J', 'мкг', 1, 0),
('J', 'J', 'г', 1000000, 0),
('J', 'J', 'мг', 1000, 0),
('A', 'A', 'МЕ', 1, 0),
('D', 'D', 'МЕ', 1, 0),
('E', 'E', 'МЕ', 1, 0),
('B1', 'B1', 'мг', 1, 0),
('B1', 'B1', 'г', 1000, 0),
('B1', 'B1', 'мкг', 0.001, 0),
('B2', 'B2', 'мг', 1, 0),
('B2', 'B2', 'г', 1000, 0),
('B2', 'B2', 'мкг', 0.001, 0),
('B3', 'B3', 'мг', 1, 0),
('B3', 'B3', 'г', 1000, 0),
('B3', 'B3', 'мкг', 0.001, 0),
('B4', 'B4', 'мг', 1, 0),
('B4', 'B4', 'г', 1000, 0),
('B4', 'B4', 'мкг', 0.001, 0),
('B5', 'B5', 'мг', 1, 0),
('B5', 'B5', 'г', 1000, 0),
('B5', 'B5', 'мкг', 0.001, 0),
('B6', 'B6', 'мг', 1, 0),
('B6', 'B6', 'г', 1000, 0),
('B6', 'B6', 'мкг', 0.001, 0),
('B7', 'B7', 'мкг', 1, 0),
('B7', 'B7', 'г', 1000000, 0),
('B7', 'B7', 'мг', 1000, 0),
('B9', 'B9', 'мкг', 1, 0),
('B9', 'B9', 'г', 1000000, 0),
('B9', 'B9', 'мг', 1000, 0),
('B12', 'B12', 'мкг', 1, 0),
('B12', 'B12', 'г', 1000000, 0),
('B12', 'B12', 'мг', 1000, 0),
('C', 'C', 'мг', 1, 0),
('C', 'C', 'г', 1000, 0),
('C', 'C', 'мкг', 0.001, 0),
('Carotene', 'Carotene', 'мг', 1, 0),
('Carotene', 'Carotene', 'г', 1000, 0),
('Carotene', 'Carotene', 'мкг', 0.001, 0),
('Arg', 'Arg', 'г', 1, 0),
('Arg', 'Arg', 'мг', 0.001, 0),
('Arg', 'Arg', 'мкг', 0.000001, 0),
('Cys', 'Cys', 'г', 1, 0),
('Cys', 'Cys', 'мг', 0.001, 0),
('Cys', 'Cys', 'мкг', 0.000001, 0),
('His', 'His', 'г', 1, 0),
('His', 'His', 'мг', 0.001, 0),
('His', 'His', 'мкг', 0.000001, 0),
('Ile', 'Ile', 'г', 1, 0),
('Ile', 'Ile', 'мг', 0.001, 0),
('Ile', 'Ile', 'мкг', 0.000001, 0),
('Leu', 'Leu', 'г', 1, 0),
('Leu', 'Leu', 'мг', 0.001, 0),
('Leu', 'Leu', 'мкг', 0.000001, 0),
('Lys', 'Lys', 'г', 1, 0),
('Lys', 'Lys', 'мг', 0.001, 0),
('Lys', 'Lys', 'мкг', 0.000001, 0),
('Met', 'Met', 'г', 1, 0),
('Met', 'Met', 'мг', 0.001, 0),
('Met', 'Met', 'мкг', 0.000001, 0),
('Phe', 'Phe', 'г', 1, 0),
('Phe', 'Phe', 'мг', 0.001, 0),
('Phe', 'Phe', 'мкг', 0.000001, 0),
('Tau', 'Tau', 'г', 1, 0),
('Tau', 'Tau', 'мг', 0.001, 0),
('Tau', 'Tau', 'мкг', 0.000001, 0),
('Thr', 'Thr', 'г', 1, 0),
('Thr', 'Thr', 'мг', 0.001, 0),
('Thr', 'Thr', 'мкг', 0.000001, 0),
('Trp', 'Trp', 'г', 1, 0),
('Trp', 'Trp', 'мг', 0.001, 0),
('Trp', 'Trp', 'мкг', 0.000001, 0),
('Tyr', 'Tyr', 'г', 1, 0),
('Tyr', 'Tyr', 'мг', 0.001, 0),
('Tyr', 'Tyr', 'мкг', 0.000001, 0),
('Val', 'Val', 'г', 1, 0),
('Val', 'Val', 'мг', 0.001, 0),
('Val', 'Val', 'мкг', 0.000001, 0),
('LA', 'LA', 'г', 1, 0),
('LA', 'LA', 'мг', 0.001, 0),
('LA', 'LA', 'мкг', 0.000001, 0),
('ALA', 'ALA', 'г', 1, 0),
('ALA', 'ALA', 'мг', 0.001, 0),
('ALA', 'ALA', 'мкг', 0.000001, 0),
('AA', 'AA', 'г', 1, 0),
('AA', 'AA', 'мг', 0.001, 0),
('AA', 'AA', 'мкг', 0.000001, 0),
('EPA', 'EPA', 'г', 1, 0),
('EPA', 'EPA', 'мг', 0.001, 0),
('EPA', 'EPA', 'мкг', 0.000001, 0),
('DHA', 'DHA', 'г', 1, 0),
('DHA', 'DHA', 'мг', 0.001, 0),
('DHA', 'DHA', 'мкг', 0.000001, 0),
('O3', 'O3', 'г', 1, 0),
('O3', 'O3', 'мг', 0.001, 0),
('O3', 'O3', 'мкг', 0.000001, 0),
('O6', 'O6', 'г', 1, 0),
('O6', 'O6', 'мг', 0.001, 0),
('O6', 'O6', 'мкг', 0.000001, 0),
('D', 'D', 'мкг', 40, 0),
('D', 'D', 'мг', 40000, 0);

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
