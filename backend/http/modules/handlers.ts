import { authErrorResponse, requireUser } from "@backend/auth/session";
import { getActiveCalculationModules } from "@backend/application/modules/queries";

export async function GET(request: Request) {
  try { return Response.json(await getActiveCalculationModules(await requireUser(request))); }
  catch (error) { return authErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    await requireUser(request, { csrf: true });
    return Response.json({ error: "Структура формул фиксирована. Коэффициенты можно изменить в конкретном расчёте" }, { status: 403 });
  } catch (error) { return authErrorResponse(error); }
}
