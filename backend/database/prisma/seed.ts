import {
  PrismaClient,
  ProductKind,
  RationMode,
  Sex,
  Species,
  UserRole,
} from "@prisma/client";
import { calculateEnergy } from "../../domain/nutrition/calculator";
import { MODULES, type ModuleId } from "../../domain/nutrition/modules";
import { formulaOpenEnd } from "../../domain/nutrition/formula-versions";
import { DEFAULT_MACROS_PER_1000_KCAL, DEFAULT_NUTRIENTS_PER_1000_KCAL, scalePer1000 } from "../../domain/nutrition/standards";
import breeds from "./breeds.json";
import { referenceNutrients } from "../../domain/catalog/nutrient-conventions";

const prisma = new PrismaClient();

const legacyNutrientDefinitions = [
  { code: "CP", name: "Сырой протеин", category: "Основные", unit: "г" },
  { code: "CFa", name: "Сырой жир", category: "Основные", unit: "г" },
  { code: "CFi", name: "Сырая клетчатка", category: "Основные", unit: "г" },
  { code: "CAs", name: "Сырая зола", category: "Основные", unit: "г" },
  { code: "CH", name: "Расчётные углеводы", category: "Основные", unit: "г" },
  { code: "MO", name: "Влага", category: "Основные", unit: "г" },
  { code: "Ca", name: "Кальций", category: "Минералы", unit: "мг" },
  { code: "P", name: "Фосфор", category: "Минералы", unit: "мг" },
  { code: "Fe", name: "Железо", category: "Минералы", unit: "мг" },
  { code: "Cu", name: "Медь", category: "Минералы", unit: "мг" },
  { code: "Zn", name: "Цинк", category: "Минералы", unit: "мг" },
  { code: "Mn", name: "Марганец", category: "Минералы", unit: "мг" },
  { code: "J", name: "Йод", category: "Минералы", unit: "мг" },
  { code: "A", name: "Витамин A", category: "Витамины", unit: "МЕ" },
  { code: "D3", name: "Витамин D3", category: "Витамины", unit: "МЕ" },
  { code: "E", name: "Витамин E", category: "Витамины", unit: "мг" },
  { code: "B1", name: "Витамин B1", category: "Витамины", unit: "мг" },
  { code: "C", name: "Витамин C", category: "Витамины", unit: "мг" },
  { code: "Tau", name: "Таурин", category: "Аминокислоты", unit: "мг" },
  { code: "LA", name: "Линолевая кислота", category: "Жирные кислоты", unit: "г" },
  { code: "O3", name: "Омега-3", category: "Жирные кислоты", unit: "мг" },
  { code: "O6", name: "Омега-6", category: "Жирные кислоты", unit: "мг" },
] as const;

const seedCode = (code: string) => code === "D3" ? "D" : code === "E" ? "E_MG" : code;
const nutrientDefinitions = legacyNutrientDefinitions.map((definition) => {
  const code = seedCode(definition.code);
  const canonical = referenceNutrients.find((nutrient) => nutrient.code === code);
  return { ...definition, ...canonical, code, isReferenceOnly: code === "E_MG" };
});
const seedFactor = (code: string) => code === "J" ? 1000 : ["Tau", "O3", "O6"].includes(code) ? 0.001 : 1;

type SeedProduct = {
  id: string;
  name: string;
  group: "cat" | "dog" | "treats";
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fibre: number;
  ash: number;
  moisture: number;
  nutrients?: Record<string, number>;
  measures: { id: string; name: string; grams: number }[];
};

// WHISKAS: official analytical constituents and energy values.
// https://www.whiskas.co.uk/cat-food/wet-cat-food/chefs-choice/whiskas-chefs-choice-gravy-adult-wet-cat-food-40x85g-12x85g
// https://www.whiskas.co.uk/cat-food/wet-cat-food/superfoods/whiskas-1-superfoods-fish-wet-cat-food-pouches-jelly-6-x-50g
// https://www.whiskas.co.uk/cat-food/wet-cat-food/classics/whiskas-1-tuna-wet-cat-food-pouch-jelly-85g
// https://www.whiskas.co.uk/cat-food/wet-cat-food/aromatic-selection/whiskas-1-aromatic-seafood-delight-wet-cat-food-pouches-gravy-12-x-85g
// https://www.whiskas.co.uk/cat-food/wet-cat-food/duo/whiskas-duo-surf-turf-jelly-adult-wet-cat-food-pouch-80x85g-40x85g-12x85g
// PEDIGREE: official analytical constituents and energy values.
// https://www.uk.pedigree.com/dog-food/wet-dog-food/pedigree-adult-wet-dog-food-mixed-gravy-40-x-100g-mega-pack-pouch
// https://www.uk.pedigree.com/dog-food/dog-treats/pedigree-tasty-minis-adult-dog-treats-chicken-duck-chewy-cubes-130g
// https://www.uk.pedigree.com/dog-food/dog-treats/pedigree-tasty-minis-adult-dog-treats-beef-poultry-chewy-slices-155g
// https://www.uk.pedigree.com/dog-food/dog-treats/pedigree-party-pack-dog-treat-selection-box-241g
// https://www.uk.pedigree.com/dog-food/dog-treats/pedigree-schmackos-poultry-dog-treats-20-strips
const products: SeedProduct[] = [
  {
    id: "seed-product-whiskas-chefs-choice",
    name: "WHISKAS 1+ Tasty Mix Chef’s Choice, соус",
    group: "cat",
    calories: 71,
    protein: 7.5,
    fat: 4,
    carbs: 1.85,
    fibre: 0.35,
    ash: 1.6,
    moisture: 84.7,
    nutrients: { LA: 0.65, B1: 2.73, C: 36, D3: 20, E: 1.82, Tau: 62, Cu: 0.12, J: 0.022, Fe: 1.12, Mn: 0.22, Zn: 1.62 },
    measures: [{ id: "seed-measure-whiskas-chefs-pouch", name: "пауч", grams: 85 }],
  },
  {
    id: "seed-product-whiskas-superfoods-fish",
    name: "WHISKAS 1+ Superfoods Fish, желе",
    group: "cat",
    calories: 78,
    protein: 7.8,
    fat: 4.5,
    carbs: 2.3,
    fibre: 0.6,
    ash: 1.4,
    moisture: 83.4,
    nutrients: { C: 36, E: 14, Tau: 67.1, Cu: 0.13, J: 0.024, Fe: 1.21, Mn: 0.24, Zn: 1.76 },
    measures: [{ id: "seed-measure-whiskas-superfoods-pouch", name: "пауч", grams: 50 }],
  },
  {
    id: "seed-product-whiskas-tuna",
    name: "WHISKAS 1+ с тунцом, желе",
    group: "cat",
    calories: 71,
    protein: 7.5,
    fat: 4,
    carbs: 1.7,
    fibre: 0.35,
    ash: 1.6,
    moisture: 84.8,
    nutrients: { LA: 0.65, B1: 2.73, C: 36, E: 1.82, Tau: 62, Cu: 0.12, J: 0.022, Fe: 1.12, Mn: 0.22, Zn: 1.62 },
    measures: [{ id: "seed-measure-whiskas-tuna-pouch", name: "пауч", grams: 85 }],
  },
  {
    id: "seed-product-whiskas-aromatic-seafood",
    name: "WHISKAS 1+ Aromatic Seafood Delight, соус",
    group: "cat",
    calories: 73,
    protein: 7.6,
    fat: 4.2,
    carbs: 1.8,
    fibre: 0.5,
    ash: 1.7,
    moisture: 84.2,
    nutrients: { LA: 0.65, B1: 2.73, C: 36, E: 1.82, Tau: 62, Cu: 0.12, J: 0.022, Fe: 1.12, Mn: 0.22, Zn: 1.62 },
    measures: [{ id: "seed-measure-whiskas-aromatic-pouch", name: "пауч", grams: 85 }],
  },
  {
    id: "seed-product-whiskas-duo",
    name: "WHISKAS 1+ Duo Surf & Turf, желе",
    group: "cat",
    calories: 72,
    protein: 7.6,
    fat: 4,
    carbs: 1.75,
    fibre: 0.35,
    ash: 1.6,
    moisture: 84.3,
    nutrients: { LA: 0.65, B1: 2.73, C: 36, E: 1.82, Tau: 62, Cu: 0.12, J: 0.022, Fe: 1.12, Mn: 0.22, Zn: 1.62 },
    measures: [{ id: "seed-measure-whiskas-duo-pouch", name: "пауч", grams: 85 }],
  },
  {
    id: "seed-product-pedigree-wet-mixed",
    name: "PEDIGREE Adult Mixed Selection, соус",
    group: "dog",
    calories: 75,
    protein: 7,
    fat: 3.8,
    carbs: 4.1,
    fibre: 0.4,
    ash: 1.7,
    moisture: 83,
    nutrients: { D3: 18.7, E: 2.8, Cu: 0.16, J: 0.026, Fe: 0.34, Mn: 0.2, Zn: 1.59 },
    measures: [{ id: "seed-measure-pedigree-wet-pouch", name: "пауч", grams: 100 }],
  },
  {
    id: "seed-product-pedigree-tasty-chicken-duck",
    name: "PEDIGREE Tasty Minis, курица и утка",
    group: "treats",
    calories: 333,
    protein: 21,
    fat: 11,
    carbs: 41,
    fibre: 3,
    ash: 9,
    moisture: 15,
    nutrients: { Ca: 1700, O3: 42.8, A: 382.4, E: 3.82, Fe: 1.15 },
    measures: [{ id: "seed-measure-pedigree-tasty-chicken-pack", name: "упаковка", grams: 130 }],
  },
  {
    id: "seed-product-pedigree-tasty-beef-poultry",
    name: "PEDIGREE Tasty Minis, говядина и птица",
    group: "treats",
    calories: 307,
    protein: 7,
    fat: 2,
    carbs: 70.1,
    fibre: 0.5,
    ash: 4.4,
    moisture: 16,
    nutrients: { Ca: 500, O3: 61.4, A: 512, E: 5.12, Fe: 1.54 },
    measures: [{ id: "seed-measure-pedigree-tasty-beef-pack", name: "упаковка", grams: 155 }],
  },
  {
    id: "seed-product-pedigree-ranchos-cubes",
    name: "PEDIGREE Ranchos Cubes, говядина",
    group: "treats",
    calories: 293,
    protein: 23,
    fat: 4,
    carbs: 45,
    fibre: 2,
    ash: 6,
    moisture: 20,
    nutrients: { Ca: 800, O3: 63.5, A: 529, E: 5.29, Fe: 1.59 },
    measures: [],
  },
  {
    id: "seed-product-pedigree-schmackos",
    name: "PEDIGREE Schmackos, птица",
    group: "treats",
    calories: 302,
    protein: 25,
    fat: 8.5,
    carbs: 35.5,
    fibre: 2.5,
    ash: 8.5,
    moisture: 20,
    nutrients: { Ca: 1000, O6: 1413.7, A: 267.2, Fe: 1.6 },
    measures: [
      { id: "seed-measure-pedigree-schmackos-strip", name: "полоска", grams: 7.2 },
      { id: "seed-measure-pedigree-schmackos-pack", name: "упаковка", grams: 144 },
    ],
  },
];

const productTagDefinitions = [
  { slug: "source-protein", name: "Источник белка" },
  { slug: "source-fat", name: "Источник жира" },
  { slug: "source-carbs", name: "Источник углеводов" },
  { slug: "fiber", name: "Клетчатка" },
  { slug: "calcium", name: "Кальций" },
  { slug: "omega-3", name: "Омега-3" },
  { slug: "vitamins", name: "Витамины" },
] as const;

const customers = [
  { id: "seed-customer-anna", name: "Анна Крылова", email: "anna@example.test", phone: "+7 900 111-22-33", note: "Предпочитает влажные рационы для кошек." },
  { id: "seed-customer-ilya", name: "Илья Морозов", email: "ilya@example.test", phone: "+7 900 222-33-44", note: "Два питомца, контроль веса раз в месяц." },
  { id: "seed-customer-maria", name: "Мария Соколова", email: "maria@example.test", phone: "+7 900 333-44-55", note: "Три питомца; лакомства учитывать в суточной энергии." },
] as const;

const pets = [
  { id: "seed-pet-barsik", customerId: "seed-customer-anna", name: "Барсик", species: Species.CAT, sex: Sex.MALE, breedId: "3de51955-b976-4433-bc38-758a27c6a6cf", actualWeight: 5.4, idealWeight: 5, bcs: 6, birthdate: "2021-04-12", moduleId: "cat-adult" as ModuleId },
  { id: "seed-pet-rey", customerId: "seed-customer-ilya", name: "Рэй", species: Species.DOG, sex: Sex.MALE, breedId: "66498f6e-6347-4fd6-ba05-ab8bd9b44d3a", actualWeight: 33, idealWeight: 35, bcs: 4, birthdate: "2020-09-03", moduleId: "dog-adult" as ModuleId },
  { id: "seed-pet-busya", customerId: "seed-customer-ilya", name: "Буся", species: Species.CAT, sex: Sex.FEMALE, breedId: "960256b6-75ff-48c0-b1cc-7eeb332f8fec", actualWeight: 9.5, idealWeight: 10, bcs: 5, birthdate: "2022-02-18", moduleId: "cat-adult" as ModuleId },
  { id: "seed-pet-jessie", customerId: "seed-customer-maria", name: "Джесси", species: Species.DOG, sex: Sex.FEMALE, breedId: "28d235f6-ed59-4935-945d-86ec3b04d9a1", actualWeight: 12.3, idealWeight: 11, bcs: 6, birthdate: "2019-07-21", moduleId: "dog-adult" as ModuleId },
  { id: "seed-pet-persik", customerId: "seed-customer-maria", name: "Персик", species: Species.CAT, sex: Sex.MALE, breedId: "9c13e89c-20a9-4fc3-bc15-ee85521dc86c", actualWeight: 4.8, idealWeight: 5, bcs: 5, birthdate: "2023-01-11", moduleId: "cat-adult" as ModuleId },
  { id: "seed-pet-nora", customerId: "seed-customer-maria", name: "Нора", species: Species.DOG, sex: Sex.FEMALE, breedId: "e75f09ef-45ca-43d2-98b5-84e9ec753aec", actualWeight: 12.5, idealWeight: 11, bcs: 6, birthdate: "2021-11-06", moduleId: "dog-adult" as ModuleId },
] as const;

async function seedCatalog(userId: string) {
  const groupIds = {
    cat: "seed-group-cat-food",
    dog: "seed-group-dog-food",
    treats: "seed-group-treats",
  } as const;
  const groupNames = {
    cat: "Влажные корма для кошек",
    dog: "Влажные корма для собак",
    treats: "Лакомства",
  } as const;

  for (const key of Object.keys(groupIds) as (keyof typeof groupIds)[]) {
    await prisma.productGroup.upsert({
      where: { id: groupIds[key] },
      update: { name: groupNames[key], userId },
      create: { id: groupIds[key], name: groupNames[key], userId },
    });
  }

  const nutrientIds = new Map<string, string>();
  for (const definition of nutrientDefinitions) {
    const nutrient = await prisma.nutrient.upsert({
      where: { userId_code: { userId, code: definition.code } },
      update: { name: definition.name, category: definition.category, unit: definition.unit, isReferenceOnly: definition.isReferenceOnly },
      create: { ...definition, userId },
    });
    nutrientIds.set(definition.code, nutrient.id);
  }

  const tagIds = new Map<string, string>();
  for (const definition of productTagDefinitions) {
    const tag = await prisma.productTag.upsert({
      where: { userId_slug: { userId, slug: definition.slug } },
      update: { name: definition.name },
      create: { ...definition, userId },
    });
    tagIds.set(definition.slug, tag.id);
  }

  const desiredMeasureIds = products.flatMap((product) =>
    product.measures.map((measure) => measure.id),
  );
  await prisma.productMeasure.deleteMany({
    where: {
      id: { startsWith: "seed-measure-", notIn: desiredMeasureIds },
    },
  });

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        kind: ProductKind.PRODUCT,
        groupId: groupIds[product.group],
        baseQuantity: 100,
        unit: "г",
        calories: product.calories,
        protein: product.protein,
        fat: product.fat,
        carbs: product.carbs,
        archived: false,
        userId,
      },
      create: {
        id: product.id,
        name: product.name,
        kind: ProductKind.PRODUCT,
        groupId: groupIds[product.group],
        baseQuantity: 100,
        unit: "г",
        calories: product.calories,
        protein: product.protein,
        fat: product.fat,
        carbs: product.carbs,
        userId,
      },
    });

    const tagSlugs = [
      ...(product.calories > 0 && product.protein / product.calories * 100 >= 7 ? ["source-protein"] : []),
      ...(product.calories > 0 && product.fat / product.calories * 100 >= 4 ? ["source-fat"] : []),
      ...(product.calories > 0 && product.carbs / product.calories * 100 >= 10 ? ["source-carbs"] : []),
      ...(product.fibre >= 2 ? ["fiber"] : []),
      ...((product.nutrients?.Ca ?? 0) > 0 ? ["calcium"] : []),
      ...((product.nutrients?.O3 ?? 0) > 0 ? ["omega-3"] : []),
    ];
    await prisma.productTagLink.deleteMany({ where: { productId: product.id } });
    await prisma.productTagLink.createMany({
      data: tagSlugs.flatMap((slug) => {
        const tagId = tagIds.get(slug);
        return tagId ? [{ productId: product.id, tagId }] : [];
      }),
    });

    for (const measure of product.measures) {
      await prisma.productMeasure.upsert({
        where: { id: measure.id },
        update: { productId: product.id, name: measure.name, grams: measure.grams },
        create: { ...measure, productId: product.id },
      });
    }

    const values: Record<string, number> = {
      CP: product.protein,
      CFa: product.fat,
      CFi: product.fibre,
      CAs: product.ash,
      CH: product.carbs,
      MO: product.moisture,
      ...product.nutrients,
    };
    const desiredNutrientIds = Object.keys(values)
      .map((code) => nutrientIds.get(seedCode(code)))
      .filter((id): id is string => Boolean(id));
    await prisma.productNutrient.deleteMany({
      where: { productId: product.id, nutrientId: { notIn: desiredNutrientIds } },
    });
    for (const [code, sourceAmount] of Object.entries(values)) {
      const nutrientId = nutrientIds.get(seedCode(code));
      if (!nutrientId) continue;
      const amount = sourceAmount * seedFactor(code);
      await prisma.productNutrient.upsert({
        where: { productId_nutrientId: { productId: product.id, nutrientId } },
        update: { amount },
        create: { productId: product.id, nutrientId, amount },
      });
    }
  }
}

async function seedClientsAndPets(userId: string) {
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: { ...customer, userId },
      create: { ...customer, userId },
    });
  }

  const energyByPet = new Map<string, number>();
  const userNutrients = await prisma.nutrient.findMany({ where: { userId, isReferenceOnly: false }, select: { id: true, code: true } });
  for (const pet of pets) {
    await prisma.pet.upsert({
      where: { id: pet.id },
      update: {
        name: pet.name,
        species: pet.species,
        sex: pet.sex,
        breedId: pet.breedId,
        actualWeight: pet.actualWeight,
        idealWeight: pet.idealWeight,
        bcs: pet.bcs,
        birthdate: new Date(`${pet.birthdate}T00:00:00.000Z`),
        customerId: pet.customerId,
        userId,
      },
      create: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        sex: pet.sex,
        breedId: pet.breedId,
        actualWeight: pet.actualWeight,
        idealWeight: pet.idealWeight,
        bcs: pet.bcs,
        birthdate: new Date(`${pet.birthdate}T00:00:00.000Z`),
        customerId: pet.customerId,
        note: "Демонстрационная запись из seed.",
        userId,
      },
    });

    const energy = calculateEnergy({
      moduleId: pet.moduleId,
      actualWeight: pet.actualWeight,
      idealWeight: pet.idealWeight,
      bcs: pet.bcs,
    });
    energyByPet.set(pet.id, energy.adjustedEnergy);
    const macros = DEFAULT_MACROS_PER_1000_KCAL[pet.species];
    const nutrientStandards = DEFAULT_NUTRIENTS_PER_1000_KCAL[pet.species];
    const calculationId = `seed-calculation-${pet.id}`;
    await prisma.calculation.upsert({
      where: { id: calculationId },
      update: {
        petId: pet.id,
        moduleId: pet.moduleId,
        formulaVersionId: `${pet.moduleId}-initial`,
        actualWeight: pet.actualWeight,
        idealWeight: pet.idealWeight,
        bcs: pet.bcs,
        baseEnergy: energy.baseEnergy,
        adjustedEnergy: energy.adjustedEnergy,
        protein: scalePer1000(macros.protein, energy.adjustedEnergy),
        fat: scalePer1000(macros.fat, energy.adjustedEnergy),
        carbs: scalePer1000(macros.carbs, energy.adjustedEnergy),
        userId,
      },
      create: {
        id: calculationId,
        petId: pet.id,
        moduleId: pet.moduleId,
        formulaVersionId: `${pet.moduleId}-initial`,
        actualWeight: pet.actualWeight,
        idealWeight: pet.idealWeight,
        bcs: pet.bcs,
        baseEnergy: energy.baseEnergy,
        adjustedEnergy: energy.adjustedEnergy,
        protein: scalePer1000(macros.protein, energy.adjustedEnergy),
        fat: scalePer1000(macros.fat, energy.adjustedEnergy),
        carbs: scalePer1000(macros.carbs, energy.adjustedEnergy),
        userId,
      },
    });
    await prisma.calculationNutrient.deleteMany({ where: { calculationId } });
    await prisma.calculationNutrient.createMany({
      data: userNutrients.flatMap((nutrient) => {
        const per1000 = nutrientStandards[nutrient.code];
        return per1000 === undefined ? [] : [{ calculationId, nutrientId: nutrient.id, targetAmount: scalePer1000(per1000, energy.adjustedEnergy) }];
      }),
    });
  }
  return energyByPet;
}

async function seedRations(userId: string, energyByPet: Map<string, number>) {
  const rationData = [
    {
      id: "seed-ration-barsik",
      name: "Влажный рацион Барсика",
      petId: "seed-pet-barsik",
      items: [
        { id: "seed-ration-item-barsik-1", productId: "seed-product-whiskas-chefs-choice", measureId: "seed-measure-whiskas-chefs-pouch", quantity: 2, grams: 170 },
        { id: "seed-ration-item-barsik-2", productId: "seed-product-whiskas-superfoods-fish", measureId: "seed-measure-whiskas-superfoods-pouch", quantity: 2, grams: 100 },
      ],
    },
    {
      id: "seed-ration-rey",
      name: "Рацион Рэя с учётом лакомств",
      petId: "seed-pet-rey",
      items: [
        { id: "seed-ration-item-rey-1", productId: "seed-product-pedigree-wet-mixed", measureId: "seed-measure-pedigree-wet-pouch", quantity: 6, grams: 600 },
        { id: "seed-ration-item-rey-2", productId: "seed-product-pedigree-schmackos", measureId: "seed-measure-pedigree-schmackos-strip", quantity: 2, grams: 14.4 },
      ],
    },
    {
      id: "seed-ration-nora",
      name: "Недельный план Норы",
      petId: "seed-pet-nora",
      mode: RationMode.WEEKLY,
      items: [
        { id: "seed-ration-item-nora-1", productId: "seed-product-pedigree-wet-mixed", measureId: "seed-measure-pedigree-wet-pouch", quantity: 4, grams: 400, day: 1 },
        { id: "seed-ration-item-nora-2", productId: "seed-product-pedigree-wet-mixed", measureId: "seed-measure-pedigree-wet-pouch", quantity: 4, grams: 400, day: 2 },
        { id: "seed-ration-item-nora-3", productId: "seed-product-pedigree-ranchos-cubes", measureId: null, quantity: 20, grams: 20, day: 2 },
      ],
    },
  ] as const;

  for (const ration of rationData) {
    const mode = "mode" in ration ? ration.mode : RationMode.DAILY;
    await prisma.ration.upsert({
      where: { id: ration.id },
      update: {
        name: ration.name,
        petId: ration.petId,
        calculationId: `seed-calculation-${ration.petId}`,
        mode,
        targetEnergy: energyByPet.get(ration.petId) ?? 0,
        note: "Демонстрационный рацион из seed.",
        userId,
      },
      create: {
        id: ration.id,
        name: ration.name,
        petId: ration.petId,
        calculationId: `seed-calculation-${ration.petId}`,
        mode,
        targetEnergy: energyByPet.get(ration.petId) ?? 0,
        note: "Демонстрационный рацион из seed.",
        userId,
      },
    });
    for (const item of ration.items) {
      const day = "day" in item ? item.day : 1;
      await prisma.rationItem.upsert({
        where: { id: item.id },
        update: { ...item, rationId: ration.id, day, enabled: true },
        create: { ...item, rationId: ration.id, day, enabled: true },
      });
    }
  }
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: UserRole.ADMIN },
    create: {
      id: "bootstrap-admin",
      username: "admin",
      passwordHash: "scrypt$-47FPPl4kPoQj1n3g5r-5w$v-YzaEqk_9OyVxhfAjtkGBvpRE9VDSKoF9bN2cYZMqnfSfoo_Pl6UFHmnXQu1VakiUA9eKrtxBKvBwkJhuW31w",
      role: UserRole.ADMIN,
    },
  });

  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await Promise.all(
    MODULES.map((module) =>
      prisma.module.upsert({
        where: { id: module.id },
        update: { name: module.name, species: module.species as Species, archived: false },
        create: { id: module.id, name: module.name, species: module.species as Species },
      }),
    ),
  );
  await Promise.all(
    MODULES.map((module) =>
      prisma.moduleFormulaVersion.upsert({
        where: { id: `${module.id}-initial` },
        update: {},
        create: {
          id: `${module.id}-initial`,
          moduleId: module.id,
          formula: module.formula,
          description: module.description,
          techBegin: new Date("2000-01-01T00:00:00.000Z"),
          techEnd: formulaOpenEnd(),
        },
      }),
    ),
  );
  await Promise.all(
    breeds.map((breed) =>
      prisma.breed.upsert({
        where: { id: breed.id },
        update: {
          species: breed.species as Species,
          nameRu: breed.nameRu,
          nameEn: breed.nameEn,
          maleIdealWeight: breed.maleIdealWeight,
          femaleIdealWeight: breed.femaleIdealWeight,
        },
        create: {
          id: breed.id,
          species: breed.species as Species,
          nameRu: breed.nameRu,
          nameEn: breed.nameEn,
          maleIdealWeight: breed.maleIdealWeight,
          femaleIdealWeight: breed.femaleIdealWeight,
        },
      }),
    ),
  );

  await seedCatalog(admin.id);
  const energyByPet = await seedClientsAndPets(admin.id);
  await seedRations(admin.id, energyByPet);

  console.log(
    "Seed complete: admin, 3 clients, 6 pets, 10 products, 22 nutrients and 3 demo rations.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
