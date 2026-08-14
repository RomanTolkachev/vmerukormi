import { z } from "zod";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { evaluateExpression } from "@backend/domain/nutrition/expression";

const variables = { AW: 10, IW: 10, BCS: 5, WEEK: 1, CHILDREN: 1, K: 18, L: 1, N: 1, M: 0 };

export async function POST(request: Request) {
  try {
    await requireUser(request, { csrf: true });
    const parsed = z.object({ formula: z.string().trim().min(1).max(500) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ valid: false, error: "Введите формулу" }, { status: 400 });
    try {
      const result = evaluateExpression(parsed.data.formula, variables);
      return Response.json({ valid: true, result });
    } catch (error) {
      return Response.json({ valid: false, error: error instanceof Error ? error.message : "Некорректная формула" }, { status: 400 });
    }
  } catch (error) {
    return authErrorResponse(error);
  }
}
