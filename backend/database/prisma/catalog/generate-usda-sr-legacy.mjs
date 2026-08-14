import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = process.argv[2];
const outputPath = process.argv[3];

if (!sourcePath || !outputPath) {
  throw new Error("Usage: node generate-usda-sr-legacy.mjs <USDA JSON> <migration.sql>");
}

const catalog = [
  [171077, "Куриная грудка без кожи, сырая", "usda-group-meat"],
  [173627, "Куриное бедро без кожи, сырое", "usda-group-meat"],
  [172850, "Фарш из индейки 93/7, сырой", "usda-group-meat"],
  [174030, "Говяжий фарш 90/10, сырой", "usda-group-meat"],
  [174036, "Говяжий фарш 80/20, сырой", "usda-group-meat"],
  [168372, "Свиной фарш 84/16, сырой", "usda-group-meat"],
  [174370, "Бараний фарш, сырой", "usda-group-meat"],
  [175293, "Фарш из бизона, сырой", "usda-group-meat"],
  [173691, "Нерка, сырая", "usda-group-fish"],
  [175167, "Лосось атлантический фермерский, сырой", "usda-group-fish"],
  [175176, "Тилапия, сырая", "usda-group-fish"],
  [171955, "Треска атлантическая, сырая", "usda-group-fish"],
  [171964, "Пикша, сырая", "usda-group-fish"],
  [173725, "Минтай аляскинский, сырой", "usda-group-fish"],
  [175179, "Креветки, сырые", "usda-group-fish"],
  [171287, "Яйцо куриное целое, сырое", "usda-group-dairy"],
  [172183, "Яичный белок, сырой", "usda-group-dairy"],
  [172184, "Яичный желток, сырой", "usda-group-dairy"],
  [170894, "Йогурт греческий натуральный обезжиренный", "usda-group-dairy"],
  [171304, "Йогурт греческий натуральный цельномолочный", "usda-group-dairy"],
  [172179, "Творог зернёный полножирный", "usda-group-dairy"],
  [169705, "Овёс цельнозерновой, сухой", "usda-group-grains"],
  [169703, "Рис бурый длиннозёрный, сухой", "usda-group-grains"],
  [169756, "Рис белый длиннозёрный, сухой", "usda-group-grains"],
  [170685, "Гречневая крупа обжаренная, сухая", "usda-group-grains"],
  [169702, "Пшено, сухое", "usda-group-grains"],
  [168482, "Батат очищенный, сырой", "usda-group-grains"],
  [170027, "Картофель красно-коричневый с кожурой, сырой", "usda-group-grains"],
  [168448, "Тыква, сырая", "usda-group-grains"],
  [169998, "Кукуруза сладкая жёлтая, сырая", "usda-group-grains"],
  [170393, "Морковь, сырая", "usda-group-vegetables"],
  [170379, "Брокколи, сырая", "usda-group-vegetables"],
  [169961, "Фасоль стручковая зелёная, сырая", "usda-group-vegetables"],
  [169291, "Кабачок цукини с кожурой, сырой", "usda-group-vegetables"],
  [169986, "Цветная капуста, сырая", "usda-group-vegetables"],
  [168462, "Шпинат, сырой", "usda-group-vegetables"],
  [168409, "Огурец с кожурой, сырой", "usda-group-vegetables"],
  [169145, "Свёкла, сырая", "usda-group-vegetables"],
  [169975, "Капуста белокочанная, сырая", "usda-group-vegetables"],
  [171688, "Яблоко с кожурой, сырое", "usda-group-fruit"],
  [171711, "Черника, сырая", "usda-group-fruit"],
  [173944, "Банан, сырой", "usda-group-fruit"],
  [169118, "Груша, сырая", "usda-group-fruit"],
  [171413, "Масло оливковое", "usda-group-fats"],
  [172336, "Масло рапсовое (канола)", "usda-group-fats"],
  [171025, "Масло подсолнечное", "usda-group-fats"],
  [169414, "Семена льна", "usda-group-fats"],
  [170554, "Семена чиа, сухие", "usda-group-fats"],
  [170556, "Семена тыквы очищенные, сухие", "usda-group-fats"],
  [170187, "Грецкий орех", "usda-group-fats"],
  [170567, "Миндаль", "usda-group-fats"],
  [172470, "Арахисовая паста без соли", "usda-group-fats"],
  [174158, "Вода питьевая негазированная", "usda-group-other"],
];

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const foods = new Map(source.SRLegacyFoods.map((food) => [food.fdcId, food]));

function nutrient(food, id) {
  return food.foodNutrients.find((item) => item.nutrient.id === id)?.amount;
}

function rounded(value) {
  return Math.round(value * 10000) / 10000;
}

function present(entries) {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, rounded(value)]));
}

const products = catalog.map(([fdcId, name, groupId]) => {
  const food = foods.get(fdcId);
  if (!food) throw new Error(`USDA food ${fdcId} not found`);

  const calories = nutrient(food, 1008) ?? 0;
  const protein = nutrient(food, 1003) ?? 0;
  const fat = nutrient(food, 1004) ?? 0;
  const carbs = nutrient(food, 1005) ?? 0;
  const fibre = nutrient(food, 1079);
  const calcium = nutrient(food, 1087);
  const phosphorus = nutrient(food, 1091);
  const iron = nutrient(food, 1089);
  const sodium = nutrient(food, 1093);
  const animalProduct = ["usda-group-meat", "usda-group-fish", "usda-group-dairy"].includes(groupId);
  const vitaminA = animalProduct ? nutrient(food, 1104) : undefined;
  const ala = nutrient(food, 1404) ?? nutrient(food, 1270) ?? 0;
  const linoleic = nutrient(food, 1316) ?? nutrient(food, 1269) ?? 0;
  const epa = nutrient(food, 1278) ?? 0;
  const dha = nutrient(food, 1272) ?? 0;
  const omega3 = (ala + epa + dha + (nutrient(food, 1280) ?? 0) + (nutrient(food, 1276) ?? 0) + (nutrient(food, 1405) ?? 0)) * 1000;
  const omega6 = (linoleic + (nutrient(food, 1271) ?? 0) + (nutrient(food, 1313) ?? 0) + (nutrient(food, 1321) ?? 0) + (nutrient(food, 1406) ?? 0)) * 1000;
  const tags = [
    ...(protein >= 10 ? ["source-protein"] : []),
    ...(fat >= 10 ? ["source-fat"] : []),
    ...(carbs >= 10 ? ["source-carbs"] : []),
    ...((fibre ?? 0) >= 2 ? ["fiber"] : []),
    ...((calcium ?? 0) >= 100 ? ["calcium"] : []),
    ...(omega3 >= 100 ? ["omega-3"] : []),
    ...((iron ?? 0) >= 2 ? ["iron"] : []),
    ...((vitaminA ?? 0) >= 500 ? ["vitamin-a"] : []),
    ...(protein <= 0.1 ? ["protein-free"] : []),
    ...(protein <= 5 ? ["low-protein"] : []),
    ...(fat <= 3 ? ["low-fat"] : []),
    ...(carbs <= 5 ? ["low-carbs"] : []),
    ...(protein >= 10 && fat <= 5 ? ["lean-protein"] : []),
    ...((fibre ?? 0) >= 5 ? ["high-fiber"] : []),
    ...(phosphorus !== undefined && phosphorus <= 100 ? ["low-phosphorus"] : []),
    ...(sodium !== undefined && sodium <= 20 ? ["low-sodium"] : []),
  ];

  return {
    id: `usda-sr-${fdcId}`,
    fdcId: String(fdcId),
    name,
    groupId,
    calories: rounded(calories),
    protein: rounded(protein),
    fat: rounded(fat),
    carbs: rounded(carbs),
    nutrients: present([
      ["CP", protein], ["CFa", fat], ["CFi", fibre], ["CAs", nutrient(food, 1007)],
      ["CH", carbs], ["MO", nutrient(food, 1051)], ["Ca", calcium], ["P", phosphorus],
      ["Na", sodium], ["Fe", iron], ["Cu", nutrient(food, 1098)], ["Zn", nutrient(food, 1095)], ["Mn", nutrient(food, 1101)],
      ["A", vitaminA], ["D3", nutrient(food, 1112) === undefined ? undefined : nutrient(food, 1112) * 40],
      ["E", nutrient(food, 1109)], ["B1", nutrient(food, 1165)], ["C", nutrient(food, 1162)],
      ["LA", linoleic || undefined], ["ALA", ala ? ala * 1000 : undefined],
      ["EPA", epa ? epa * 1000 : undefined], ["DHA", dha ? dha * 1000 : undefined],
      ["O3", omega3 || undefined], ["O6", omega6 || undefined],
    ]),
    tags,
  };
});

const payload = JSON.stringify(products);
const sql = `-- Curated veterinary ingredient catalog from USDA FoodData Central SR Legacy (04/2018).
-- Source records are public domain under CC0. Values are expressed per 100 g.

ALTER TABLE "Product"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceExternalId" TEXT;

CREATE UNIQUE INDEX "Product_userId_source_sourceExternalId_key"
  ON "Product"("userId", "source", "sourceExternalId");

INSERT INTO "ProductGroup" ("id", "name", "parentId", "userId") VALUES
  ('usda-group-meat', 'Мясо и птица', NULL, 'bootstrap-admin'),
  ('usda-group-fish', 'Рыба и морепродукты', NULL, 'bootstrap-admin'),
  ('usda-group-dairy', 'Яйца и молочные продукты', NULL, 'bootstrap-admin'),
  ('usda-group-grains', 'Крупы и крахмалистые продукты', NULL, 'bootstrap-admin'),
  ('usda-group-vegetables', 'Овощи', NULL, 'bootstrap-admin'),
  ('usda-group-fruit', 'Фрукты и ягоды', NULL, 'bootstrap-admin'),
  ('usda-group-fats', 'Масла, орехи и семена', NULL, 'bootstrap-admin'),
  ('usda-group-other', 'Прочее', NULL, 'bootstrap-admin')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";

INSERT INTO "Nutrient" ("id", "code", "name", "category", "unit", "userId") VALUES
  ('usda-nutrient-cp', 'CP', 'Сырой протеин', 'Основные', 'г', 'bootstrap-admin'),
  ('usda-nutrient-cfa', 'CFa', 'Сырой жир', 'Основные', 'г', 'bootstrap-admin'),
  ('usda-nutrient-cfi', 'CFi', 'Сырая клетчатка', 'Основные', 'г', 'bootstrap-admin'),
  ('usda-nutrient-cas', 'CAs', 'Сырая зола', 'Основные', 'г', 'bootstrap-admin'),
  ('usda-nutrient-ch', 'CH', 'Расчётные углеводы', 'Основные', 'г', 'bootstrap-admin'),
  ('usda-nutrient-mo', 'MO', 'Влага', 'Основные', 'г', 'bootstrap-admin'),
  ('usda-nutrient-ca', 'Ca', 'Кальций', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-p', 'P', 'Фосфор', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-na', 'Na', 'Натрий', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-fe', 'Fe', 'Железо', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-cu', 'Cu', 'Медь', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-zn', 'Zn', 'Цинк', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-mn', 'Mn', 'Марганец', 'Минералы', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-a', 'A', 'Витамин A', 'Витамины', 'МЕ', 'bootstrap-admin'),
  ('usda-nutrient-d3', 'D3', 'Витамин D3', 'Витамины', 'МЕ', 'bootstrap-admin'),
  ('usda-nutrient-e', 'E', 'Витамин E', 'Витамины', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-b1', 'B1', 'Витамин B1', 'Витамины', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-c', 'C', 'Витамин C', 'Витамины', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-la', 'LA', 'Линолевая кислота', 'Жирные кислоты', 'г', 'bootstrap-admin'),
  ('usda-nutrient-ala', 'ALA', 'Альфа-линоленовая кислота', 'Жирные кислоты', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-epa', 'EPA', 'Эйкозапентаеновая кислота', 'Жирные кислоты', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-dha', 'DHA', 'Докозагексаеновая кислота', 'Жирные кислоты', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-o3', 'O3', 'Омега-3', 'Жирные кислоты', 'мг', 'bootstrap-admin'),
  ('usda-nutrient-o6', 'O6', 'Омега-6', 'Жирные кислоты', 'мг', 'bootstrap-admin')
ON CONFLICT ("userId", "code") DO UPDATE SET
  "name" = EXCLUDED."name", "category" = EXCLUDED."category", "unit" = EXCLUDED."unit";

INSERT INTO "ProductTag" ("id", "name", "slug", "userId") VALUES
  ('usda-tag-protein', 'Источник белка', 'source-protein', 'bootstrap-admin'),
  ('usda-tag-fat', 'Источник жира', 'source-fat', 'bootstrap-admin'),
  ('usda-tag-carbs', 'Источник углеводов', 'source-carbs', 'bootstrap-admin'),
  ('usda-tag-fiber', 'Клетчатка', 'fiber', 'bootstrap-admin'),
  ('usda-tag-calcium', 'Кальций', 'calcium', 'bootstrap-admin'),
  ('usda-tag-omega-3', 'Омега-3', 'omega-3', 'bootstrap-admin'),
  ('usda-tag-iron', 'Железо', 'iron', 'bootstrap-admin'),
  ('usda-tag-vitamin-a', 'Витамин A', 'vitamin-a', 'bootstrap-admin'),
  ('usda-tag-protein-free', 'Без белка', 'protein-free', 'bootstrap-admin'),
  ('usda-tag-low-protein', 'Низкий белок', 'low-protein', 'bootstrap-admin'),
  ('usda-tag-low-fat', 'Низкий жир', 'low-fat', 'bootstrap-admin'),
  ('usda-tag-low-carbs', 'Низкие углеводы', 'low-carbs', 'bootstrap-admin'),
  ('usda-tag-lean-protein', 'Постный белок', 'lean-protein', 'bootstrap-admin'),
  ('usda-tag-high-fiber', 'Высокая клетчатка', 'high-fiber', 'bootstrap-admin'),
  ('usda-tag-low-phosphorus', 'Низкий фосфор', 'low-phosphorus', 'bootstrap-admin'),
  ('usda-tag-low-sodium', 'Низкий натрий', 'low-sodium', 'bootstrap-admin')
ON CONFLICT ("userId", "slug") DO UPDATE SET "name" = EXCLUDED."name";

CREATE TEMP TABLE "_UsdaCatalog" AS
SELECT * FROM jsonb_to_recordset($catalog$${payload}$catalog$::jsonb) AS value(
  "id" TEXT, "fdcId" TEXT, "name" TEXT, "groupId" TEXT,
  "calories" DOUBLE PRECISION, "protein" DOUBLE PRECISION,
  "fat" DOUBLE PRECISION, "carbs" DOUBLE PRECISION,
  "nutrients" JSONB, "tags" JSONB
);

INSERT INTO "Product" (
  "id", "name", "kind", "groupId", "baseQuantity", "unit",
  "calories", "protein", "fat", "carbs", "source", "sourceExternalId",
  "archived", "createdAt", "updatedAt", "userId"
)
SELECT
  "id", "name", 'PRODUCT'::"ProductKind", "groupId", 100, 'г',
  "calories", "protein", "fat", "carbs", 'USDA FoodData Central SR Legacy', "fdcId",
  false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'bootstrap-admin'
FROM "_UsdaCatalog"
ON CONFLICT ("userId", "source", "sourceExternalId") DO UPDATE SET
  "name" = EXCLUDED."name", "groupId" = EXCLUDED."groupId",
  "calories" = EXCLUDED."calories", "protein" = EXCLUDED."protein",
  "fat" = EXCLUDED."fat", "carbs" = EXCLUDED."carbs",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ProductMeasure" ("id", "productId", "name", "grams")
SELECT 'usda-measure-water-ml', product."id", 'мл', 1
FROM "Product" AS product
WHERE product."userId" = 'bootstrap-admin'
  AND product."source" = 'USDA FoodData Central SR Legacy'
  AND product."sourceExternalId" = '174158'
ON CONFLICT ("id") DO UPDATE SET "productId" = EXCLUDED."productId", "name" = EXCLUDED."name", "grams" = EXCLUDED."grams";

INSERT INTO "ProductNutrient" ("productId", "nutrientId", "amount")
SELECT product."id", nutrient."id", entry.value::TEXT::DOUBLE PRECISION
FROM "_UsdaCatalog" AS source
JOIN "Product" AS product
  ON product."userId" = 'bootstrap-admin'
 AND product."source" = 'USDA FoodData Central SR Legacy'
 AND product."sourceExternalId" = source."fdcId"
CROSS JOIN LATERAL jsonb_each(source."nutrients") AS entry
JOIN "Nutrient" AS nutrient
  ON nutrient."userId" = 'bootstrap-admin' AND nutrient."code" = entry.key
ON CONFLICT ("productId", "nutrientId") DO UPDATE SET "amount" = EXCLUDED."amount";

INSERT INTO "ProductTagLink" ("productId", "tagId")
SELECT product."id", tag."id"
FROM "_UsdaCatalog" AS source
JOIN "Product" AS product
  ON product."userId" = 'bootstrap-admin'
 AND product."source" = 'USDA FoodData Central SR Legacy'
 AND product."sourceExternalId" = source."fdcId"
CROSS JOIN LATERAL jsonb_array_elements_text(source."tags") AS selected_tag("slug")
JOIN "ProductTag" AS tag
  ON tag."userId" = 'bootstrap-admin' AND tag."slug" = selected_tag."slug"
ON CONFLICT ("productId", "tagId") DO NOTHING;
`;

writeFileSync(outputPath, sql);
console.log(`Generated ${products.length} USDA products in ${outputPath}`);
