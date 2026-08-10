import { authErrorResponse, requireUser } from "@backend/auth/session";
import { exportRationXlsx } from "@backend/application/rations/export-xlsx";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const exported = await exportRationXlsx(user.id, id);
    if (!exported) return Response.json({ error: "Рацион не найден" }, { status: 404 });

    return new Response(exported.buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="ration-${id}.xlsx"; filename*=UTF-8''${encodeURIComponent(exported.fileName)}`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
