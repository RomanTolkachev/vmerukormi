import { ownerScope } from "@backend/domain/accounts/policy";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

const petSchema = z.object({
  name: z.string().trim().min(1).max(80),
  species: z.string().min(1).max(40),
  sex: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  breedId: z.string().uuid().optional().nullable(),
  customerId: z.string().cuid().optional().nullable(),
  actualWeight: z.coerce.number().positive().max(150),
  idealWeight: z.coerce.number().positive().max(150),
  bcs: z.coerce.number().int().min(1).max(9),
  note: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await prisma.pet.findMany({ where: { ...ownerScope(user) }, include: { breed: true, customer: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } }));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = petSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Проверьте данные питомца", details: parsed.error.flatten() }, { status: 400 });
    if (!await prisma.animalSpecies.findFirst({ where: { code: parsed.data.species } })) return NextResponse.json({ error: "Выберите существующий вид животного" }, { status: 400 });
    if (parsed.data.breedId && !await prisma.breed.findFirst({ where: { id: parsed.data.breedId, species: parsed.data.species } })) return NextResponse.json({ error: "Порода не соответствует виду питомца" }, { status: 400 });
    if (parsed.data.customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, ...ownerScope(user) }, select: { id: true } });
      if (!customer) return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }
    return NextResponse.json(await prisma.pet.create({ data: { ...parsed.data, userId: user.id }, include: { breed: true, customer: { select: { id: true, name: true } } } }), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
