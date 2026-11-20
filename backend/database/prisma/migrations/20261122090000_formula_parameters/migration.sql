BEGIN;
CREATE TABLE "AnimalSpecies" (
  "code" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "deletedAt" TIMESTAMP(3), "deletedById" TEXT
);
CREATE UNIQUE INDEX "AnimalSpecies_name_key" ON "AnimalSpecies"("name");
INSERT INTO "AnimalSpecies" (code, name) VALUES ('CAT', 'Кошка'), ('DOG', 'Собака');
ALTER TABLE "Module" ALTER COLUMN species TYPE TEXT USING species::text;
ALTER TABLE "Pet" ALTER COLUMN species TYPE TEXT USING species::text;
ALTER TABLE "Breed" ALTER COLUMN species TYPE TEXT USING species::text;
ALTER TABLE "Module" ADD CONSTRAINT "Module_species_fkey" FOREIGN KEY (species) REFERENCES "AnimalSpecies"(code) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_species_fkey" FOREIGN KEY (species) REFERENCES "AnimalSpecies"(code) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Breed" ADD CONSTRAINT "Breed_species_fkey" FOREIGN KEY (species) REFERENCES "AnimalSpecies"(code) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Module" ADD COLUMN "speciesCodes" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "Module" SET "speciesCodes" = ARRAY[species];
ALTER TABLE "Module" ALTER COLUMN "speciesCodes" DROP DEFAULT;
ALTER TABLE "ModuleFormulaVersion" ADD COLUMN "nameSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "speciesCodes" TEXT[] NOT NULL DEFAULT '{}', ADD COLUMN "templateKey" TEXT;
UPDATE "ModuleFormulaVersion" version SET "nameSnapshot" = module.name, "speciesCodes" = module."speciesCodes"
FROM "Module" module WHERE module.id = version."moduleId";
ALTER TABLE "ModuleFormulaVersion" ALTER COLUMN "speciesCodes" DROP DEFAULT;
ALTER TABLE "Calculation" ADD COLUMN name TEXT NOT NULL DEFAULT 'Расчёт', ADD COLUMN species TEXT NOT NULL DEFAULT 'CAT',
  ADD COLUMN parameters JSONB NOT NULL DEFAULT '{}', ADD COLUMN "formulaSnapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN bus_begin TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN bus_end TIMESTAMP(3),
  ALTER COLUMN "actualWeight" DROP NOT NULL, ALTER COLUMN "idealWeight" DROP NOT NULL, ALTER COLUMN bcs DROP NOT NULL,
  ALTER COLUMN "lactationWeek" DROP NOT NULL, ALTER COLUMN "lactationWeek" DROP DEFAULT,
  ALTER COLUMN "childrenCount" DROP NOT NULL, ALTER COLUMN "childrenCount" DROP DEFAULT;
UPDATE "Calculation" calculation SET name = 'Расчёт ' || calculation.id, species = module.species,
  bus_begin = calculation."createdAt", bus_end = calculation."deletedAt",
  parameters = jsonb_build_object('AW', calculation."actualWeight", 'IW', calculation."idealWeight", 'BCS', calculation.bcs, 'LACTATION_WEEK', calculation."lactationWeek", 'CHILDREN', calculation."childrenCount"),
  "formulaSnapshot" = jsonb_build_object('name', module.name, 'formula', version.formula, 'versionId', version.id, 'speciesCodes', version."speciesCodes")
FROM "Module" module, "ModuleFormulaVersion" version WHERE module.id = calculation."moduleId" AND version.id = calculation."formulaVersionId";
CREATE UNIQUE INDEX "Calculation_owner_active_name_key" ON "Calculation"("userId", lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) WHERE "deletedAt" IS NULL;
ALTER TABLE "Ration" ADD COLUMN bus_begin TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN bus_end TIMESTAMP(3);
UPDATE "Ration" SET bus_begin = "createdAt", bus_end = "deletedAt";
DO $migration$
DECLARE
  definition JSONB;
  started TIMESTAMP(3);
BEGIN
  FOR definition IN SELECT * FROM jsonb_array_elements($templates$[{"id":"cat-adult","name":"Кошка, взрослая","species":"CAT","formula":"100 * IW ^ 0.67","description":"Для расчёта используется идеальная масса."},{"id":"cat-senior-cardio","name":"Кошка, сеньор кардио","species":"CAT","formula":"100 * IW ^ 0.67","description":"Энергетическая формула совпадает со взрослой кошкой."},{"id":"cat-lactation","name":"Кошка, лактация","species":"CAT","formula":"100 * IW ^ 0.67 + IW * K * L","description":"K: <3=18; 3–4=60; ≥5=70. L зависит от недели."},{"id":"cat-pregnancy","name":"Кошка, беременность","species":"CAT","formula":"140 * IW ^ 0.67","description":"Беременность."},{"id":"cat-kitten","name":"Кошка, котёнок","species":"CAT","formula":"100 * AW ^ 0.67 * 6.7 * (exp(-0.189 * AW / IW) - 0.66)","description":"IW — ожидаемая взрослая масса."},{"id":"dog-pregnancy-1","name":"Собака, беременность I","species":"DOG","formula":"132 * IW ^ 0.75","description":"Первая фаза беременности."},{"id":"dog-pregnancy-2","name":"Собака, беременность II","species":"DOG","formula":"130 * IW ^ 0.75 + 26 * IW","description":"Вторая фаза беременности."},{"id":"dog-adult","name":"Собака, взрослая","species":"DOG","formula":"100 * IW ^ 0.75","description":"Для расчёта используется идеальная масса."},{"id":"dog-lactation","name":"Собака, лактация","species":"DOG","formula":"100 * IW ^ 0.75 + IW * (24 * N + 12 * M) * L","description":"N — первые 4 щенка, M — следующие 4; L зависит от недели."},{"id":"dog-senior-cardio","name":"Собака, сеньор кардио","species":"DOG","formula":"90 * IW ^ 0.75","description":"Пониженный коэффициент."},{"id":"dog-sport","name":"Собака, спорт и работа","species":"DOG","formula":"100 * IW ^ 0.75","description":"Нагрузку задавайте через поправку ОЭ."},{"id":"dog-puppy-1","name":"Щенок 1 фаза роста","species":"DOG","formula":"100 * AW ^ 0.75 * 3.2 * (exp(-0.87 * AW / IW) - 0.1)","description":"IW — ожидаемая взрослая масса."},{"id":"dog-puppy-2","name":"Щенок 2 фаза роста","species":"DOG","formula":"100 * AW ^ 0.75 * 3.2 * (exp(-0.87 * AW / IW) - 0.1)","description":"По ОЭ совпадает с первой фазой; нутриентные нормы могут отличаться."}]$templates$::jsonb)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM "Module" WHERE id = definition->>'id' AND "deletedAt" IS NULL AND archived = false) THEN CONTINUE; END IF;
    SELECT GREATEST(CURRENT_TIMESTAMP::timestamp, COALESCE(max(tech_begin) + interval '1 millisecond', CURRENT_TIMESTAMP::timestamp)) INTO started
      FROM "ModuleFormulaVersion" WHERE "moduleId" = definition->>'id';
    UPDATE "ModuleFormulaVersion" SET tech_end = started WHERE "moduleId" = definition->>'id' AND tech_end > started;
    UPDATE "Module" SET species = definition->>'species', "speciesCodes" = ARRAY[definition->>'species'] WHERE id = definition->>'id';
    INSERT INTO "ModuleFormulaVersion" (id, "moduleId", formula, description, "nameSnapshot", "speciesCodes", "templateKey", tech_begin, tech_end)
      SELECT 'fixed-formula-v1-' || module.id, module.id, definition->>'formula', definition->>'description', module.name, module."speciesCodes", module.id || ':v1', started, '2399-12-31 23:59:59.999'
      FROM "Module" module WHERE module.id = definition->>'id';
  END LOOP;
END $migration$;
COMMIT;
