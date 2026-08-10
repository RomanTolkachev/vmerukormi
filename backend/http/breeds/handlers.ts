import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const species = request.nextUrl.searchParams.get("species");
    return NextResponse.json(await prisma.breed.findMany({
      where: species === "CAT" || species === "DOG" ? { species } : undefined,
      orderBy: { nameRu: "asc" },
    }));
  } catch (error) {
    return authErrorResponse(error);
  }
}
