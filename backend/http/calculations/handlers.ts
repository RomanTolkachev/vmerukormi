import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateEnergy } from "@backend/domain/nutrition/calculator";
import { energyFromMacros } from "@backend/domain/nutrition/standards";
import { getCalculationStandards } from "@backend/application/calculations/standards";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { readableCatalog } from "@backend/domain/catalog/access";

const schema = z.object({
  petId: z.string().optional().nullable(),
  breedId: z.string().optional().nullable(),
  sex: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  moduleId: z.string().trim().min(1),
  actualWeight: z.coerce.number().positive().max(150),
  idealWeight: z.coerce.number().positive().max(150),
  bcs: z.coerce.number().int().min(1).max(9).default(5),
  energyFactor: z.coerce.number().min(0.1).max(5).default(1),
  lactationWeek: z.coerce.number().int().min(1).max(12).default(1),
  childrenCount: z.coerce.number().int().min(0).max(20).default(0),
  adjustedEnergy: z.coerce.number().positive().max(100000).optional(),
  protein: z.coerce.number().min(0).max(10000).optional(),
  fat: z.coerce.number().min(0).max(10000).optional(),
  carbs: z.coerce.number().min(0).max(10000).optional(),
  nutrients: z.array(z.object({ nutrientId: z.string(), targetAmount: z.coerce.number().min(0).max(100000000) })).optional(),
  save: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await prisma.calculation.findMany({
      where: { userId: user.id },
      include: { pet: { select: { name: true } }, module: { select: { name: true } }, nutrients: { include: { nutrient: true } } },
      orderBy: { createdAt: "desc" }, take: 50,
    });
    return NextResponse.json(rows);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Проверьте параметры", details: parsed.error.flatten() }, { status: 400 });
    const { save, breedId, sex, nutrients: submittedNutrients, adjustedEnergy: submittedEnergy, protein, fat, carbs, ...input } = parsed.data;
    if (submittedNutrients) {
      const nutrientIds = submittedNutrients.map((value) => value.nutrientId);
      const visibleCount = await prisma.nutrient.count({ where: { id: { in: nutrientIds }, ...readableCatalog(user.id) } });
      if (visibleCount !== nutrientIds.length) return NextResponse.json({ error: "Нутриенты недоступны или повторяются" }, { status: 400 });
    }
    let effectiveBreedId = breedId;
    let effectiveSex = sex;
    if (input.petId) {
      const pet = await prisma.pet.findFirst({ where: { id: input.petId, userId: user.id }, select: { id: true, breedId: true, sex: true } });
      if (!pet) return NextResponse.json({ error: "Питомец не найден" }, { status: 404 });
      effectiveBreedId = pet.breedId;
      effectiveSex = pet.sex;
    }
    const now = new Date();
    const calculationModule = await prisma.module.findFirst({
      where: { id: input.moduleId, archived: false },
      include: { versions: { where: { techBegin: { lte: now }, techEnd: { gt: now } }, orderBy: { techBegin: "desc" }, take: 1 } },
    });
    if (!calculationModule) return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
    const formulaVersion = calculationModule.versions[0];
    if (!formulaVersion) return NextResponse.json({ error: "Для методики нет действующей версии формулы" }, { status: 409 });
    const energyResult = calculateEnergy(input, formulaVersion.formula);
    const standards = await getCalculationStandards({ userId: user.id, species: calculationModule.species, breedId: effectiveBreedId, sex: effectiveSex, energy: submittedEnergy ?? energyResult.adjustedEnergy });
    const macros = {
      protein: protein ?? standards.macros.protein,
      fat: fat ?? standards.macros.fat,
      carbs: carbs ?? standards.macros.carbs,
    };
    const adjustedEnergy = submittedEnergy ?? (protein !== undefined || fat !== undefined || carbs !== undefined
      ? Math.round(energyFromMacros(macros.protein, macros.fat, macros.carbs))
      : energyResult.adjustedEnergy);
    const result = { ...energyResult, adjustedEnergy, ...macros, nutrients: submittedNutrients ?? standards.nutrients.filter((item) => item.targetAmount !== null).map((item) => ({ nutrientId: item.nutrientId, targetAmount: item.targetAmount as number })), standardNutrients: standards.nutrients, standardSource: standards.source };
    if (!save) return NextResponse.json(result);
    const calculation = await prisma.calculation.create({
      data: {
        ...input,
        formulaVersionId: formulaVersion.id,
        baseEnergy: result.baseEnergy,
        adjustedEnergy: result.adjustedEnergy,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
        userId: user.id,
        nutrients: { create: result.nutrients },
      },
      include: { pet: true, module: true, nutrients: { include: { nutrient: true } } },
    });
    return NextResponse.json(calculation, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
