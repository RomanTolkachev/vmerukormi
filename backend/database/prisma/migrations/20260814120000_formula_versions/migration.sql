CREATE TABLE "ModuleFormulaVersion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "description" TEXT,
    "tech_begin" DATE NOT NULL,
    "tech_end" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleFormulaVersion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ModuleFormulaVersion" ("id", "moduleId", "formula", "description", "tech_begin", "tech_end")
SELECT "id" || '-initial', "id", "formula", "description", DATE '2000-01-01', DATE '2399-12-31'
FROM "Module";

ALTER TABLE "Module" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Calculation" ADD COLUMN "formulaVersionId" TEXT;

UPDATE "Calculation" AS calculation
SET "formulaVersionId" = calculation."moduleId" || '-initial';

ALTER TABLE "Calculation" ALTER COLUMN "formulaVersionId" SET NOT NULL;
ALTER TABLE "Module" DROP COLUMN "formula";
ALTER TABLE "Module" DROP COLUMN "description";

CREATE UNIQUE INDEX "ModuleFormulaVersion_moduleId_tech_begin_key" ON "ModuleFormulaVersion"("moduleId", "tech_begin");
CREATE INDEX "ModuleFormulaVersion_moduleId_tech_begin_tech_end_idx" ON "ModuleFormulaVersion"("moduleId", "tech_begin", "tech_end");
CREATE INDEX "Calculation_formulaVersionId_idx" ON "Calculation"("formulaVersionId");

ALTER TABLE "ModuleFormulaVersion" ADD CONSTRAINT "ModuleFormulaVersion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_formulaVersionId_fkey" FOREIGN KEY ("formulaVersionId") REFERENCES "ModuleFormulaVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
