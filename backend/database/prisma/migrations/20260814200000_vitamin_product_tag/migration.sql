INSERT INTO "ProductTag" ("id", "name", "slug", "userId")
VALUES ('catalog-tag-vitamins', 'Витамины', 'vitamins', 'bootstrap-admin')
ON CONFLICT ("userId", "slug") DO UPDATE SET "name" = EXCLUDED."name";
