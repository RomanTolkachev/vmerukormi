-- CreateEnum
CREATE TYPE "Species" AS ENUM ('CAT', 'DOG');

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "formula" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "actualWeight" DOUBLE PRECISION NOT NULL,
    "idealWeight" DOUBLE PRECISION NOT NULL,
    "bcs" INTEGER NOT NULL DEFAULT 5,
    "birthdate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL,
    "petId" TEXT,
    "moduleId" TEXT NOT NULL,
    "actualWeight" DOUBLE PRECISION NOT NULL,
    "idealWeight" DOUBLE PRECISION NOT NULL,
    "bcs" INTEGER NOT NULL,
    "energyFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lactationWeek" INTEGER NOT NULL DEFAULT 1,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "baseEnergy" INTEGER NOT NULL,
    "adjustedEnergy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calculation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE INDEX "Calculation_createdAt_idx" ON "Calculation"("createdAt");

-- CreateIndex
CREATE INDEX "Calculation_petId_idx" ON "Calculation"("petId");

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
