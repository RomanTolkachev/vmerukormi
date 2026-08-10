import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateEnergy } from "@backend/domain/nutrition/calculator";
import { MODULES, type ModuleId } from "@backend/domain/nutrition/modules";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

const moduleIds = MODULES.map((item) => item.id) as [ModuleId, ...ModuleId[]];
const schema = z.object({
  petId: z.string().optional().nullable(),
  moduleId: z.enum(moduleIds),
  actualWeight: z.coerce.number().positive().max(150),
  idealWeight: z.coerce.number().positive().max(150),
  bcs: z.coerce.number().int().min(1).max(9).default(5),
  energyFactor: z.coerce.number().min(0.1).max(5).default(1),
  lactationWeek: z.coerce.number().int().min(1).max(12).default(1),
  childrenCount: z.coerce.number().int().min(0).max(20).default(0),
  save: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await prisma.calculation.findMany({
      where: { userId: user.id },
      include: { pet: { select: { name: true } }, module: { select: { name: true } } },
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
    const { save, ...input } = parsed.data;
    if (input.petId) {
      const pet = await prisma.pet.findFirst({ where: { id: input.petId, userId: user.id }, select: { id: true } });
      if (!pet) return NextResponse.json({ error: "Питомец не найден" }, { status: 404 });
    }
    const result = calculateEnergy(input);
    if (!save) return NextResponse.json(result);
    const calculation = await prisma.calculation.create({ data: { ...input, ...result, userId: user.id }, include: { pet: true, module: true } });
    return NextResponse.json(calculation, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
