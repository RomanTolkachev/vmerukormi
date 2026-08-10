-- Remove superseded single-tenant indexes after adding the owner prefix.
DROP INDEX "Customer_name_idx";
DROP INDEX "Nutrient_category_name_idx";
DROP INDEX "Product_groupId_name_idx";
DROP INDEX "Ration_petId_updatedAt_idx";
