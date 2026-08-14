ALTER TABLE "ModuleFormulaVersion"
  ALTER COLUMN "tech_begin" TYPE TIMESTAMP(3) USING "tech_begin"::timestamp,
  ALTER COLUMN "tech_end" TYPE TIMESTAMP(3) USING "tech_end"::timestamp;

UPDATE "ModuleFormulaVersion"
SET "tech_end" = TIMESTAMP '2399-12-31 23:59:59.999'
WHERE "tech_end"::date = DATE '2399-12-31';
