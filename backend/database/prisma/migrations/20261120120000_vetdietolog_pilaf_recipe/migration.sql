BEGIN;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "recipeInstructions" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "recipeNotes" TEXT;

DO $migration$
DECLARE
  definition JSONB := $recipe${
    "id": "vetdietolog-dog-pilaf",
    "name": "Плов для взрослых собак (с Vetdietolog Adult Balance)",
    "source": "https://vetdietolog.ru/recipes/dogs/dog-pilaf",
    "sourceExternalId": "dog-pilaf",
    "baseQuantity": 100,
    "unit": "г",
    "calories": 126,
    "protein": 11,
    "fat": 3.3,
    "carbs": 13.3,
    "nutrients": { "CFi": 0.8, "CAs": 1.4, "MO": 69.6 },
    "recipeInstructions": "1. Мясо и измельчённую морковь обжарить с маслом.\n2. Всыпать рис; на одну его часть использовать три части воды.\n3. Готовить на слабом огне до готовности риса, доливая воду при необходимости.\n4. Дать блюду остыть и отделить порцию.\n5. Adult Balance вмешивать непосредственно перед кормлением. Добавку не нагревать и не замораживать.",
    "recipeNotes": "Опубликованный состав на 100 г готового блюда. По условию автора, полноценность рациона обеспечивается только с Vetdietolog Adult Balance. Импортирован ручной состав: граммовки ингредиентов, дозировка добавки и масса готовой партии не заданы. Это не индивидуальное назначение для питомца. Порядок приготовления изложен по источнику."
  }$recipe$::JSONB;
  inserted_id TEXT;
  nutrient_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = definition->>'id'
      OR ("userId" = 'bootstrap-admin' AND "source" = definition->>'source'
          AND "sourceExternalId" = definition->>'sourceExternalId')
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = 'bootstrap-admin') THEN
    RAISE EXCEPTION 'Cannot import pilaf: bootstrap catalog owner is missing';
  END IF;

  SELECT count(*) INTO nutrient_count
  FROM "Nutrient"
  WHERE "userId" = 'bootstrap-admin' AND "isShared" = true
    AND "deletedAt" IS NULL AND "isReferenceOnly" = false
    AND "code" IN ('CFi', 'CAs', 'MO') AND "unit" IN ('г', 'мг', 'мкг');

  IF nutrient_count <> 3 THEN
    RAISE EXCEPTION 'Cannot import pilaf: shared CFi, CAs and MO nutrients with mass units are required';
  END IF;

  INSERT INTO "Product" (
    "id", "name", "kind", "userId", "isShared", "source", "sourceExternalId",
    "baseQuantity", "unit", "calories", "protein", "fat", "carbs",
    "recipeInstructions", "recipeNotes", "updatedAt"
  ) VALUES (
    definition->>'id', definition->>'name', 'RECIPE', 'bootstrap-admin', true,
    definition->>'source', definition->>'sourceExternalId',
    (definition->>'baseQuantity')::DOUBLE PRECISION, definition->>'unit',
    (definition->>'calories')::DOUBLE PRECISION, (definition->>'protein')::DOUBLE PRECISION,
    (definition->>'fat')::DOUBLE PRECISION, (definition->>'carbs')::DOUBLE PRECISION,
    definition->>'recipeInstructions', definition->>'recipeNotes', CURRENT_TIMESTAMP
  ) ON CONFLICT DO NOTHING RETURNING "id" INTO inserted_id;

  IF inserted_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "ProductNutrient" ("productId", "nutrientId", "amount")
  SELECT inserted_id, nutrient."id", value.amount::DOUBLE PRECISION *
    CASE nutrient."unit" WHEN 'мг' THEN 1000 WHEN 'мкг' THEN 1000000 ELSE 1 END
  FROM jsonb_each_text(definition->'nutrients') AS value(code, amount)
  JOIN "Nutrient" AS nutrient ON nutrient."code" = value.code
    AND nutrient."userId" = 'bootstrap-admin' AND nutrient."isShared" = true
    AND nutrient."deletedAt" IS NULL AND nutrient."isReferenceOnly" = false
    AND nutrient."unit" IN ('г', 'мг', 'мкг');
END;
$migration$;

COMMIT;
