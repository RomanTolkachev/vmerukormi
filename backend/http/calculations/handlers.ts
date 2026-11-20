import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ownerScope } from "@backend/domain/accounts/policy";
import { readableCatalog } from "@backend/domain/catalog/access";
import { CatalogError } from "@backend/domain/catalog/recipe";
import { calculateWithParameters, cleanParameters, getFormulaTemplate, displayFormula } from "@backend/domain/nutrition/parameters";
import { getCalculationStandards } from "@backend/application/calculations/standards";
import { energyFromMacros } from "@backend/domain/nutrition/standards";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

const schema = z.object({
  name: z.string().trim().max(160).optional(), petId: z.string().nullable().optional(),
  breedId: z.string().nullable().optional(), sex: z.enum(["MALE", "FEMALE"]).nullable().optional(),
  moduleId: z.string().min(1), species: z.string().min(1), expectedVersionId: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).default({}),
  coefficients: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  energyFactor: z.number().positive().default(1),
  adjustedEnergy: z.number().int().positive().max(2147483647).optional(),
  protein: z.number().min(0).optional(), fat: z.number().min(0).optional(), carbs: z.number().min(0).optional(),
  nutrients: z.array(z.object({ nutrientId: z.string(), targetAmount: z.number().min(0) })).max(500).optional(),
  save: z.boolean().default(true),
}).strict();
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await prisma.calculation.findMany({ where: ownerScope(user), include: { pet: { select: { name: true } }, module: { select: { name: true } }, nutrients: { include: { nutrient: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return Response.json(rows.map(row => ({ ...row, module: { name: (row.formulaSnapshot as { name?: string }).name ?? row.module.name } })));
  } catch (error) { return authErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new CatalogError(400, `Проверьте поле ${parsed.error.issues[0]?.path.join(".")}`);
    const data = parsed.data;
    if (data.save && !data.name?.trim()) throw new CatalogError(400, "Введите название расчёта");
    if (!await prisma.animalSpecies.findFirst({ where: { code: data.species } })) throw new CatalogError(400, "Выберите существующий вид животного");
    let breedId = data.breedId, sex = data.sex;
    if (data.petId) {
      const pet = await prisma.pet.findFirst({ where: { id: data.petId, ...ownerScope(user) } });
      if (!pet) throw new CatalogError(404, "Питомец не найден");
      if (pet.species !== data.species) throw new CatalogError(400, "Вид расчёта должен совпадать с видом питомца");
      breedId = pet.breedId; sex = pet.sex;
    }
    if (breedId && !await prisma.breed.findFirst({ where: { id: breedId, species: data.species } })) throw new CatalogError(400, "Порода не соответствует виду питомца");
    await prisma.$queryRaw`SELECT id FROM "Module" WHERE id = ${data.moduleId} FOR SHARE`;
    const now = new Date();
    const formula = await prisma.module.findFirst({ where: { id: data.moduleId, archived: false, speciesCodes: { has: data.species } }, include: { versions: { where: { techBegin: { lte: now }, techEnd: { gt: now } }, orderBy: { techBegin: "desc" }, take: 1 } } });
    if (!formula) throw new CatalogError(404, "Формула недоступна или не подходит для вида питомца");
    const version = formula.versions[0];
    if (!version) throw new CatalogError(409, "У формулы нет действующей версии");
    const template = getFormulaTemplate(version.templateKey);
    if (!template || template.moduleId !== formula.id || template.formula !== version.formula || !version.speciesCodes.includes(data.species) || !template.speciesCodes.includes(data.species)) throw new CatalogError(409, "Эта версия сохранена только для истории. Выберите действующую формулу");
    if ((data.save || data.expectedVersionId) && data.expectedVersionId !== version.id) throw new CatalogError(409, "Формула изменилась. Выберите её заново и повторите расчёт");
    let parameters, energy;
    try { parameters = cleanParameters(data.parameters, template); energy = calculateWithParameters(template, parameters, data.coefficients, data.energyFactor); }
    catch (error) { throw new CatalogError(400, error instanceof Error ? error.message : "Проверьте параметры формулы"); }
    const standards = await getCalculationStandards({ userId: user.id, species: data.species, breedId, sex, energy: data.adjustedEnergy ?? energy.adjustedEnergy });
    const macros = { protein: data.protein ?? standards.macros.protein, fat: data.fat ?? standards.macros.fat, carbs: data.carbs ?? standards.macros.carbs };
    const adjustedEnergy = data.adjustedEnergy ?? ([data.protein, data.fat, data.carbs].some(value => value !== undefined) ? Math.round(energyFromMacros(macros.protein, macros.fat, macros.carbs)) : energy.adjustedEnergy);
    if (adjustedEnergy <= 0 || adjustedEnergy > 2147483647) throw new CatalogError(400, "Укажите положительную калорийность до 2 147 483 647 ккал");
    const nutrients = data.nutrients ?? standards.nutrients.filter(item => item.targetAmount !== null).map(item => ({ nutrientId: item.nutrientId, targetAmount: item.targetAmount as number }));
    if (await prisma.nutrient.count({ where: { id: { in: nutrients.map(item => item.nutrientId) }, ...readableCatalog(user), isReferenceOnly: false } }) !== nutrients.length) throw new CatalogError(400, "Нутриенты недоступны или повторяются");
    const result = { ...energy, adjustedEnergy, ...macros, standardNutrients: standards.nutrients, standardSource: standards.source, formulaVersionId: version.id, formulaExpression: displayFormula(template, energy.coefficients) };
    if (!data.save) return Response.json(result);
    const calculation = await prisma.calculation.create({ data: {
      name: data.name!.trim().replace(/\s+/g, " "), species: data.species, petId: data.petId || null,
      moduleId: formula.id, formulaVersionId: version.id, userId: user.id,
      parameters: parameters as Prisma.InputJsonValue,
      formulaSnapshot: { name: version.nameSnapshot, formula: version.formula, expression: template.expression, templateKey: template.key, versionId: version.id, speciesCodes: version.speciesCodes, variables: energy.variables, coefficients: energy.coefficients, energyFactor: data.energyFactor },
      actualWeight: parameters.AW, idealWeight: parameters.IW,
      lactationWeek: parameters.LACTATION_WEEK, childrenCount: parameters.CHILDREN,
      energyFactor: data.energyFactor, baseEnergy: energy.baseEnergy, adjustedEnergy, ...macros,
      nutrients: { create: nutrients },
    }, include: { pet: true, module: true, nutrients: { include: { nutrient: true } } } });
    return Response.json(calculation, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new CatalogError(409, "У вас уже есть расчёт с таким названием. Измените название");
    return authErrorResponse(error);
  }
}
