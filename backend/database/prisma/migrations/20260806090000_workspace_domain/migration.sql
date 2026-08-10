-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PRODUCT', 'SUPPLEMENT', 'RECIPE');

-- CreateEnum
CREATE TYPE "RationMode" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "customerId" TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetMeasurement" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION NOT NULL,
    "bcs" INTEGER,
    "note" TEXT,

    CONSTRAINT "PetMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nutrient" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "Nutrient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL DEFAULT 'PRODUCT',
    "groupId" TEXT,
    "baseQuantity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "unit" TEXT NOT NULL DEFAULT 'г',
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductNutrient" (
    "productId" TEXT NOT NULL,
    "nutrientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,

    CONSTRAINT "ProductNutrient_pkey" PRIMARY KEY ("productId","nutrientId")
);

-- CreateTable
CREATE TABLE "ProductMeasure" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "petId" TEXT,
    "mode" "RationMode" NOT NULL DEFAULT 'DAILY',
    "targetEnergy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "sharedToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RationItem" (
    "id" TEXT NOT NULL,
    "rationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "measureId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "grams" DOUBLE PRECISION NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TablePreference" (
    "tableName" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TablePreference_pkey" PRIMARY KEY ("tableName")
);

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "PetMeasurement_petId_measuredAt_idx" ON "PetMeasurement"("petId", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Nutrient_code_key" ON "Nutrient"("code");

-- CreateIndex
CREATE INDEX "Nutrient_category_name_idx" ON "Nutrient"("category", "name");

-- CreateIndex
CREATE INDEX "Product_groupId_name_idx" ON "Product"("groupId", "name");

-- CreateIndex
CREATE INDEX "ProductMeasure_productId_idx" ON "ProductMeasure"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Ration_sharedToken_key" ON "Ration"("sharedToken");

-- CreateIndex
CREATE INDEX "Ration_petId_updatedAt_idx" ON "Ration"("petId", "updatedAt");

-- CreateIndex
CREATE INDEX "RationItem_rationId_day_idx" ON "RationItem"("rationId", "day");

-- CreateIndex
CREATE INDEX "RationItem_productId_idx" ON "RationItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Pet_customerId_idx" ON "Pet"("customerId");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMeasurement" ADD CONSTRAINT "PetMeasurement_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNutrient" ADD CONSTRAINT "ProductNutrient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNutrient" ADD CONSTRAINT "ProductNutrient_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "Nutrient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMeasure" ADD CONSTRAINT "ProductMeasure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_rationId_fkey" FOREIGN KEY ("rationId") REFERENCES "Ration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "ProductMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
