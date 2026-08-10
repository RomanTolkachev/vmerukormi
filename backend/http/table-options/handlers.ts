import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

export async function getTableOptions(request: Request, { params }: { params: Promise<{ tableName: string }> }) {
  try {
    const user = await requireUser(request);
    const { tableName } = await params;
    const row = await prisma.tablePreference.findUnique({ where: { userId_tableName: { userId: user.id, tableName } } });
    return Response.json(row?.config ?? {});
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function putTableOptions(request: Request, { params }: { params: Promise<{ tableName: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { tableName } = await params;
    const config = await request.json();
    await prisma.tablePreference.upsert({
      where: { userId_tableName: { userId: user.id, tableName } },
      create: { userId: user.id, tableName, config },
      update: { config },
    });
    return Response.json(config);
  } catch (error) {
    return authErrorResponse(error);
  }
}
