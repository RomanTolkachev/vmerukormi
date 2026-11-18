import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { rawPrisma } from "@backend/infrastructure/database/prisma";
import { databaseContext } from "@backend/infrastructure/database/context";

export function withRequestAudit<Context extends { params: Promise<Record<string, string>> } = { params: Promise<Record<string, string>> }>(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context) => {
    const requestId = randomUUID();
    try {
      if (request.method === "GET" && !new URL(request.url).pathname.endsWith("/export")) return await handler(request, context);
      return await rawPrisma.$transaction(transaction => databaseContext.run({ transaction, requestId }, async () => {
        const response = await handler(request, context);
        if (response.status >= 400) throw response;
        return response;
      }), { maxWait: 5000, timeout: 20000 });
    } catch (error) {
      if (error instanceof Response) return error;
      if (error instanceof SyntaxError) return Response.json({ error: "Некорректное тело запроса" }, { status: 400 });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") return Response.json({ error: "Запись с такими данными уже существует, в том числе среди удалённых" }, { status: 409 });
        if (error.code === "P2025") return Response.json({ error: "Запись не найдена или удалена" }, { status: 404 });
        if (error.code === "P2003") return Response.json({ error: "Проверьте связанные записи" }, { status: 409 });
      }
      console.error("Request failed", requestId, error instanceof Error ? error.name : "Unknown");
      return Response.json({ error: "Не удалось выполнить действие. Повторите попытку.", requestId }, { status: 500 });
    }
  };
}
