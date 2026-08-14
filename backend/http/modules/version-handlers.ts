import { z } from "zod";
import { AuthError, authErrorResponse, requireUser } from "@backend/auth/session";
import { evaluateExpression } from "@backend/domain/nutrition/expression";
import { formulaOpenEnd, formulaStart } from "@backend/domain/nutrition/formula-versions";
import { prisma } from "@backend/infrastructure/database/prisma";

const variables = { AW: 10, IW: 10, BCS: 5, WEEK: 1, CHILDREN: 1, K: 18, L: 1, N: 1, M: 0 };
const schema = z.object({
  name: z.string().trim().min(1).max(160),
  formula: z.string().trim().min(1).max(500),
  description: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    if (user.role !== "ADMIN") throw new AuthError(403, "Изменять формулы может только администратор");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте новую версию" }, { status: 400 });
    try {
      evaluateExpression(parsed.data.formula, variables);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Некорректная формула" }, { status: 400 });
    }
    const { id } = await params;
    const techBegin = formulaStart();
    const openEnd = formulaOpenEnd();

    const created = await prisma.$transaction(async (tx) => {
      const calculationMethod = await tx.module.findUnique({ where: { id }, select: { id: true } });
      if (!calculationMethod) return null;
      const latest = await tx.moduleFormulaVersion.findFirst({ where: { moduleId: id }, orderBy: { techBegin: "desc" } });
      if (latest && latest.techBegin > techBegin) throw new Error("У методики уже есть будущая версия");
      if (latest) await tx.moduleFormulaVersion.update({ where: { id: latest.id }, data: { techEnd: techBegin } });
      await tx.module.update({ where: { id }, data: { name: parsed.data.name } });
      return tx.moduleFormulaVersion.create({ data: { moduleId: id, formula: parsed.data.formula, description: parsed.data.description ?? null, techBegin, techEnd: openEnd } });
    });
    if (!created) return Response.json({ error: "Методика не найдена" }, { status: 404 });
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "У методики уже есть будущая версия") return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && "code" in error && error.code === "P2002") return Response.json({ error: "Методика с таким названием уже существует" }, { status: 409 });
    return authErrorResponse(error);
  }
}
