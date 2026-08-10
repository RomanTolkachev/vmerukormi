import { NextResponse } from "next/server";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const result = await prisma.calculation.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return NextResponse.json({ error: "Расчёт не найден" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
