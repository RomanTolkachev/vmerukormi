ALTER TABLE "ModuleFormulaVersion" DROP CONSTRAINT "ModuleFormulaVersion_moduleId_fkey";
ALTER TABLE "ModuleFormulaVersion" ADD CONSTRAINT "ModuleFormulaVersion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pet" DROP CONSTRAINT "Pet_breedId_fkey";
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pet" DROP CONSTRAINT "Pet_customerId_fkey";
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pet" DROP CONSTRAINT "Pet_userId_fkey";
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Calculation" DROP CONSTRAINT "Calculation_petId_fkey";
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Calculation" DROP CONSTRAINT "Calculation_userId_fkey";
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CalculationNutrient" DROP CONSTRAINT "CalculationNutrient_calculationId_fkey";
ALTER TABLE "CalculationNutrient" ADD CONSTRAINT "CalculationNutrient_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BreedStandard" DROP CONSTRAINT "BreedStandard_breedId_fkey";
ALTER TABLE "BreedStandard" ADD CONSTRAINT "BreedStandard_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BreedStandard" DROP CONSTRAINT "BreedStandard_userId_fkey";
ALTER TABLE "BreedStandard" ADD CONSTRAINT "BreedStandard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BreedStandardNutrient" DROP CONSTRAINT "BreedStandardNutrient_standardId_fkey";
ALTER TABLE "BreedStandardNutrient" ADD CONSTRAINT "BreedStandardNutrient_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "BreedStandard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PetMeasurement" DROP CONSTRAINT "PetMeasurement_petId_fkey";
ALTER TABLE "PetMeasurement" ADD CONSTRAINT "PetMeasurement_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductGroup" DROP CONSTRAINT "ProductGroup_parentId_fkey";
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductGroup" DROP CONSTRAINT "ProductGroup_userId_fkey";
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Nutrient" DROP CONSTRAINT "Nutrient_userId_fkey";
ALTER TABLE "Nutrient" ADD CONSTRAINT "Nutrient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" DROP CONSTRAINT "Product_groupId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_userId_fkey";
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductTagLink" DROP CONSTRAINT "ProductTagLink_productId_fkey";
ALTER TABLE "ProductTagLink" ADD CONSTRAINT "ProductTagLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductTagLink" DROP CONSTRAINT "ProductTagLink_tagId_fkey";
ALTER TABLE "ProductTagLink" ADD CONSTRAINT "ProductTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProductTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductNutrient" DROP CONSTRAINT "ProductNutrient_productId_fkey";
ALTER TABLE "ProductNutrient" ADD CONSTRAINT "ProductNutrient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductNutrient" DROP CONSTRAINT "ProductNutrient_nutrientId_fkey";
ALTER TABLE "ProductNutrient" ADD CONSTRAINT "ProductNutrient_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "Nutrient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductMeasure" DROP CONSTRAINT "ProductMeasure_productId_fkey";
ALTER TABLE "ProductMeasure" ADD CONSTRAINT "ProductMeasure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ration" DROP CONSTRAINT "Ration_petId_fkey";
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ration" DROP CONSTRAINT "Ration_calculationId_fkey";
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ration" DROP CONSTRAINT "Ration_userId_fkey";
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RationItem" DROP CONSTRAINT "RationItem_rationId_fkey";
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_rationId_fkey" FOREIGN KEY ("rationId") REFERENCES "Ration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RationItem" DROP CONSTRAINT "RationItem_measureId_fkey";
ALTER TABLE "RationItem" ADD CONSTRAINT "RationItem_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "ProductMeasure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_userId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePreference" DROP CONSTRAINT "TablePreference_userId_fkey";
ALTER TABLE "TablePreference" ADD CONSTRAINT "TablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
