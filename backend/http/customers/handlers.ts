import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await prisma.customer.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }));
  } catch (error) {
    return authErrorResponse(error);
  }
}

