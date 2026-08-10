-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "breedId" TEXT,
ADD COLUMN     "sex" "Sex";

-- CreateTable
CREATE TABLE "Breed" (
    "id" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "maleIdealWeight" DOUBLE PRECISION NOT NULL,
    "femaleIdealWeight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Breed_species_nameRu_idx" ON "Breed"("species", "nameRu");

-- CreateIndex
CREATE INDEX "Pet_breedId_idx" ON "Pet"("breedId");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
