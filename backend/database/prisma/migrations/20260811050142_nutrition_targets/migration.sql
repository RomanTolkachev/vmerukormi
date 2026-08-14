-- AlterTable
ALTER TABLE "Calculation" ADD COLUMN     "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "protein" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Ration" ADD COLUMN     "calculationId" TEXT;

-- CreateTable
CREATE TABLE "CalculationNutrient" (
    "calculationId" TEXT NOT NULL,
    "nutrientId" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CalculationNutrient_pkey" PRIMARY KEY ("calculationId","nutrientId")
);

-- CreateTable
CREATE TABLE "BreedStandard" (
    "id" TEXT NOT NULL,
    "breedId" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "idealWeight" DOUBLE PRECISION NOT NULL,
    "proteinPer1000Kcal" DOUBLE PRECISION NOT NULL,
    "fatPer1000Kcal" DOUBLE PRECISION NOT NULL,
    "carbsPer1000Kcal" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BreedStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreedStandardNutrient" (
    "standardId" TEXT NOT NULL,
    "nutrientId" TEXT NOT NULL,
    "amountPer1000Kcal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BreedStandardNutrient_pkey" PRIMARY KEY ("standardId","nutrientId")
);

-- CreateIndex
CREATE INDEX "CalculationNutrient_nutrientId_idx" ON "CalculationNutrient"("nutrientId");

-- CreateIndex
CREATE INDEX "BreedStandard_breedId_sex_idx" ON "BreedStandard"("breedId", "sex");

-- CreateIndex
CREATE UNIQUE INDEX "BreedStandard_userId_breedId_sex_key" ON "BreedStandard"("userId", "breedId", "sex");

-- CreateIndex
CREATE INDEX "BreedStandardNutrient_nutrientId_idx" ON "BreedStandardNutrient"("nutrientId");

-- CreateIndex
CREATE INDEX "Ration_calculationId_idx" ON "Ration"("calculationId");

-- AddForeignKey
ALTER TABLE "CalculationNutrient" ADD CONSTRAINT "CalculationNutrient_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationNutrient" ADD CONSTRAINT "CalculationNutrient_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "Nutrient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedStandard" ADD CONSTRAINT "BreedStandard_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedStandard" ADD CONSTRAINT "BreedStandard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedStandardNutrient" ADD CONSTRAINT "BreedStandardNutrient_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "BreedStandard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedStandardNutrient" ADD CONSTRAINT "BreedStandardNutrient_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "Nutrient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
