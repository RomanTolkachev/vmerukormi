import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

const petSchema = z.object({
  name: z.string().trim().min(1).max(80),
  species: z.enum(["CAT", "DOG"]),
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
    return NextResponse.json(await prisma.pet.findMany({ where: { userId: user.id }, include: { breed: true, customer: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } }));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = petSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Проверьте данные питомца", details: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, userId: user.id }, select: { id: true } });
      if (!customer) return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }
    return NextResponse.json(await prisma.pet.create({ data: { ...parsed.data, userId: user.id }, include: { breed: true, customer: { select: { id: true, name: true } } } }), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
