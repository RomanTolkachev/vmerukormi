CREATE TABLE "ProductTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductTagLink" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "ProductTagLink_pkey" PRIMARY KEY ("productId", "tagId")
);

CREATE UNIQUE INDEX "ProductTag_userId_slug_key" ON "ProductTag"("userId", "slug");
CREATE INDEX "ProductTag_userId_name_idx" ON "ProductTag"("userId", "name");
CREATE INDEX "ProductTagLink_tagId_idx" ON "ProductTagLink"("tagId");

ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTagLink" ADD CONSTRAINT "ProductTagLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTagLink" ADD CONSTRAINT "ProductTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProductTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
