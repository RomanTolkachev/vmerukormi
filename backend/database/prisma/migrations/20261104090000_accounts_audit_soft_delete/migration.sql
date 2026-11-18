ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Module" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ModuleFormulaVersion" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Pet" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Breed" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Calculation" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "CalculationNutrient" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "BreedStandard" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "BreedStandardNutrient" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "PetMeasurement" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ProductGroup" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Nutrient" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ProductTag" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ProductTagLink" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ProductNutrient" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ProductMeasure" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Ration" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "RationItem" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "TablePreference" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;

ALTER TABLE "User" ADD COLUMN "email" TEXT, ADD COLUMN "name" TEXT;
UPDATE "User" SET "email" = CASE WHEN "id" = 'bootstrap-admin' THEN 'admin@vetenergy.ru' ELSE 'legacy-' || encode(convert_to("id", 'UTF8'), 'hex') || '@vetenergy.test' END, "name" = "username";
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL, ALTER COLUMN "name" SET NOT NULL;
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "RationItem" ADD COLUMN "productSnapshot" JSONB;

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "requestId" TEXT
);
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent" ("createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent" ("actorId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent" ("entityType", "entityId");

CREATE TABLE "CaptchaChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "secret" TEXT NOT NULL,
  "challenge" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3)
);
CREATE INDEX "CaptchaChallenge_expiresAt_idx" ON "CaptchaChallenge" ("expiresAt");

CREATE TABLE "AuthRateLimit" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit" ("expiresAt");

UPDATE "RationItem" AS item SET "productSnapshot" = jsonb_build_object(
  'version', 1,
  'product', jsonb_build_object(
    'id', product."id", 'name', product."name", 'baseQuantity', product."baseQuantity", 'unit', product."unit",
    'calories', product."calories", 'protein', product."protein", 'fat', product."fat", 'carbs', product."carbs",
    'measures', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', measure."id", 'name', measure."name", 'grams', measure."grams")) FROM "ProductMeasure" measure WHERE measure."productId" = product."id"), '[]'::jsonb),
    'nutrients', COALESCE((SELECT jsonb_agg(jsonb_build_object('nutrientId', composition."nutrientId", 'amount', composition."amount", 'nutrient', jsonb_build_object('code', nutrient."code", 'name', nutrient."name", 'unit', nutrient."unit", 'category', nutrient."category"))) FROM "ProductNutrient" composition JOIN "Nutrient" nutrient ON nutrient."id" = composition."nutrientId" WHERE composition."productId" = product."id" AND NOT nutrient."isReferenceOnly"), '[]'::jsonb),
    'tags', '[]'::jsonb
  ),
  'measure', CASE WHEN item."measureId" IS NULL THEN NULL ELSE (SELECT jsonb_build_object('id', measure."id", 'name', measure."name", 'grams', CASE WHEN item."quantity" > 0 THEN item."grams" / item."quantity" ELSE measure."grams" END) FROM "ProductMeasure" measure WHERE measure."id" = item."measureId") END
) FROM "Product" product WHERE product."id" = item."productId";
