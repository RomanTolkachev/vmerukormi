BEGIN;
ALTER TABLE "Product" ADD COLUMN "recipeYieldGrams" DOUBLE PRECISION,
  ADD COLUMN "recipeIngredients" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "ProductVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL,
  "bus_begin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bus_end" TIMESTAMP(3),
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "ProductVersion_period_check" CHECK ("bus_end" IS NULL OR "bus_end" > "bus_begin")
);
CREATE UNIQUE INDEX "ProductVersion_productId_revision_key" ON "ProductVersion"("productId", "revision");
CREATE UNIQUE INDEX "ProductVersion_current_key" ON "ProductVersion"("productId") WHERE "bus_end" IS NULL;
CREATE INDEX "ProductVersion_productId_bus_begin_idx" ON "ProductVersion"("productId", "bus_begin");
INSERT INTO "ProductVersion" ("id", "productId", "revision", "action", "snapshot")
SELECT 'initial-' || product."id", product."id", 1, 'MIGRATION',
  (to_jsonb(product) - 'userId' - 'createdAt' - 'updatedAt' - 'deletedById') || jsonb_build_object(
    'recipeInstructions', coalesce(product."recipeInstructions", ''), 'recipeNotes', coalesce(product."recipeNotes", ''),
    'tagIds', coalesce((SELECT jsonb_agg(link."tagId" ORDER BY link."tagId") FROM "ProductTagLink" link WHERE link."productId" = product."id" AND link."deletedAt" IS NULL), '[]'::jsonb),
    'measures', coalesce((SELECT jsonb_agg(jsonb_build_object('id', measure."id", 'name', measure."name", 'grams', measure."grams") ORDER BY measure."id") FROM "ProductMeasure" measure WHERE measure."productId" = product."id" AND measure."deletedAt" IS NULL), '[]'::jsonb),
    'nutrients', coalesce((SELECT jsonb_agg(jsonb_build_object('nutrientId', value."nutrientId", 'amount', value."amount", 'nutrient', jsonb_build_object('id', nutrient."id", 'code', nutrient."code", 'name', nutrient."name", 'category', nutrient."category", 'unit', nutrient."unit")) ORDER BY value."nutrientId") FROM "ProductNutrient" value JOIN "Nutrient" nutrient ON nutrient."id" = value."nutrientId" WHERE value."productId" = product."id" AND value."deletedAt" IS NULL AND nutrient."isReferenceOnly" = false), '[]'::jsonb)
  )
FROM "Product" product;
CREATE FUNCTION protect_product_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Product history cannot be deleted'; END IF;
  IF OLD."bus_end" IS NOT NULL OR NEW."bus_end" IS NULL OR
    (to_jsonb(NEW) - 'bus_end') IS DISTINCT FROM (to_jsonb(OLD) - 'bus_end') THEN
    RAISE EXCEPTION 'Only closing the current product version is allowed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ProductVersion_immutable" BEFORE UPDATE OR DELETE ON "ProductVersion" FOR EACH ROW EXECUTE FUNCTION protect_product_version();
COMMIT;
