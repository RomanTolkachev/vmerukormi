import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const species = request.nextUrl.searchParams.get("species");
    const breeds = await prisma.breed.findMany({
      where: species === "CAT" || species === "DOG" ? { species } : undefined,
      include: { standards: { where: { userId: user.id }, select: { sex: true, idealWeight: true } } },
      orderBy: { nameRu: "asc" },
    });
    return NextResponse.json(breeds.map((breed) => ({
      id: breed.id,
      species: breed.species,
      nameRu: breed.nameRu,
      nameEn: breed.nameEn,
      maleIdealWeight: breed.standards.find((item) => item.sex === "MALE")?.idealWeight ?? breed.maleIdealWeight,
      femaleIdealWeight: breed.standards.find((item) => item.sex === "FEMALE")?.idealWeight ?? breed.femaleIdealWeight,
    })));
  } catch (error) {
    return authErrorResponse(error);
  }
}
