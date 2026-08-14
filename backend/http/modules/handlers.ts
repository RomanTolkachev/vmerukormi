import { z } from "zod";
import { AuthError, authErrorResponse, requireUser } from "@backend/auth/session";
import { getActiveCalculationModules } from "@backend/application/modules/queries";
import { evaluateExpression } from "@backend/domain/nutrition/expression";
import { formulaOpenEnd, formulaStart } from "@backend/domain/nutrition/formula-versions";
import { prisma } from "@backend/infrastructure/database/prisma";

const formulaVariables = { AW: 10, IW: 10, BCS: 5, WEEK: 1, CHILDREN: 1, K: 18, L: 1, N: 1, M: 0 };
const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  species: z.enum(["CAT", "DOG"]),
  formula: z.string().trim().min(1).max(500),
  description: z.string().trim().max(1000).nullable().optional(),
});

function requireAdmin(user: Awaited<ReturnType<typeof requireUser>>) {
  if (user.role !== "ADMIN") throw new AuthError(403, "Изменять формулы может только администратор");
}

export function validateFormula(formula: string) {
  return evaluateExpression(formula, formulaVariables);
}

export async function GET(request: Request) {
  try {
    await requireUser(request);
    return Response.json(await getActiveCalculationModules());
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    requireAdmin(user);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте параметры методики" }, { status: 400 });
    try {
      validateFormula(parsed.data.formula);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Некорректная формула" }, { status: 400 });
    }
    const techBegin = formulaStart();
    const techEnd = formulaOpenEnd();
    const created = await prisma.module.create({
      data: {
        name: parsed.data.name,
        species: parsed.data.species,
        versions: { create: { formula: parsed.data.formula, description: parsed.data.description ?? null, techBegin, techEnd } },
      },
      include: { versions: true },
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") return Response.json({ error: "Методика с таким названием уже существует" }, { status: 409 });
    return authErrorResponse(error);
  }
}
