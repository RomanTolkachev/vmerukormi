ALTER TABLE "ModuleFormulaVersion"
ADD CONSTRAINT "ModuleFormulaVersion_valid_period_check"
CHECK ("tech_begin" < "tech_end");

CREATE UNIQUE INDEX "ModuleFormulaVersion_one_open_per_module_idx"
ON "ModuleFormulaVersion"("moduleId")
WHERE "tech_end" = TIMESTAMP '2399-12-31 23:59:59.999';
