import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  species: z.enum(["CAT", "DOG"]).optional(),
  sex: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  breedId: z.string().uuid().optional().nullable(),
  customerId: z.string().cuid().optional().nullable(),
  actualWeight: z.coerce.number().positive().max(150).optional(),
  idealWeight: z.coerce.number().positive().max(150).optional(),
  bcs: z.coerce.number().int().min(1).max(9).optional(),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    if (parsed.data.customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, userId: user.id }, select: { id: true } });
      if (!customer) return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }
    const result = await prisma.pet.updateMany({ where: { id, userId: user.id }, data: parsed.data });
    if (!result.count) return NextResponse.json({ error: "Питомец не найден" }, { status: 404 });
    return NextResponse.json(await prisma.pet.findFirst({ where: { id, userId: user.id }, include: { breed: true, customer: { select: { id: true, name: true } } } }));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const result = await prisma.pet.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return NextResponse.json({ error: "Питомец не найден" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
