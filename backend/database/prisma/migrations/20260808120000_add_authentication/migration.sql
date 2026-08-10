-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Bootstrap owner for all data that existed before authentication.
INSERT INTO "User" ("id", "username", "passwordHash", "role", "updatedAt")
VALUES (
    'bootstrap-admin',
    'admin',
    'scrypt$-47FPPl4kPoQj1n3g5r-5w$v-YzaEqk_9OyVxhfAjtkGBvpRE9VDSKoF9bN2cYZMqnfSfoo_Pl6UFHmnXQu1VakiUA9eKrtxBKvBwkJhuW31w',
    'ADMIN',
    CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Assign all existing private data to the bootstrap administrator.
ALTER TABLE "Pet" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Calculation" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Customer" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "ProductGroup" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Nutrient" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Product" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Ration" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Notification" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "Invoice" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';
ALTER TABLE "TablePreference" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'bootstrap-admin';

ALTER TABLE "Pet" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Calculation" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "ProductGroup" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Nutrient" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Ration" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Notification" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "TablePreference" ALTER COLUMN "userId" DROP DEFAULT;

DROP INDEX "Nutrient_code_key";
DROP INDEX "Invoice_number_key";
ALTER TABLE "TablePreference" DROP CONSTRAINT "TablePreference_pkey";

CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");
CREATE INDEX "Calculation_userId_createdAt_idx" ON "Calculation"("userId", "createdAt");
CREATE INDEX "Customer_userId_name_idx" ON "Customer"("userId", "name");
CREATE INDEX "ProductGroup_userId_idx" ON "ProductGroup"("userId");
CREATE UNIQUE INDEX "Nutrient_userId_code_key" ON "Nutrient"("userId", "code");
CREATE INDEX "Nutrient_userId_category_name_idx" ON "Nutrient"("userId", "category", "name");
CREATE INDEX "Product_userId_groupId_name_idx" ON "Product"("userId", "groupId", "name");
CREATE INDEX "Ration_userId_petId_updatedAt_idx" ON "Ration"("userId", "petId", "updatedAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE UNIQUE INDEX "Invoice_userId_number_key" ON "Invoice"("userId", "number");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
ALTER TABLE "TablePreference" ADD CONSTRAINT "TablePreference_pkey" PRIMARY KEY ("userId", "tableName");

ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Nutrient" ADD CONSTRAINT "Nutrient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ration" ADD CONSTRAINT "Ration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TablePreference" ADD CONSTRAINT "TablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
