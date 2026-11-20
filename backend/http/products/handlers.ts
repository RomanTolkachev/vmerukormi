import { authErrorResponse, requireUser } from "@backend/auth/session";
import { readProduct, saveProduct, previewRecipe, productHistory, restoreProductVersion } from "@backend/application/products/versions";
import { z } from "zod";
import { CatalogError } from "@backend/domain/catalog/recipe";

function responseError(error: unknown) {
  return error instanceof CatalogError ? Response.json({ error: error.message }, { status: error.status }) : authErrorResponse(error);
}

type ProductContext = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: ProductContext) {
  try { return Response.json(await readProduct((await params).id, await requireUser(request))); }
  catch (error) { return responseError(error); }
}
export async function POST(request: Request) {
  try { return Response.json(await saveProduct(await request.json(), await requireUser(request, { csrf: true })), { status: 201 }); }
  catch (error) { return authErrorResponse(error); }
}
export async function PATCH(request: Request, { params }: ProductContext) {
  try { return Response.json(await saveProduct(await request.json(), await requireUser(request, { csrf: true }), (await params).id)); }
  catch (error) { return authErrorResponse(error); }
}
export async function PREVIEW(request: Request) {
  try { return Response.json(await previewRecipe(await request.json(), await requireUser(request, { csrf: true }))); }
  catch (error) { return authErrorResponse(error); }
}
export async function HISTORY(request: Request, { params }: ProductContext) {
  try {
    const query = new URL(request.url).searchParams;
    const page = Math.min(100000, Math.max(0, Math.floor(Number(query.get("page")) || 0)));
    return Response.json(await productHistory((await params).id, await requireUser(request), query.get("versionId") || undefined, page));
  }
  catch (error) { return responseError(error); }
}
export async function RESTORE(request: Request, { params }: ProductContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = z.object({ versionId: z.string().min(1), expectedRevision: z.number().int().positive() }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте версию" }, { status: 400 });
    return Response.json(await restoreProductVersion((await params).id, parsed.data.versionId, parsed.data.expectedRevision, user));
  } catch (error) { return authErrorResponse(error); }
}
async function atomicEditorRequired(request: Request) {
  try {
    await requireUser(request, { csrf: true });
    return Response.json({ error: "Состав сохраняется целиком. Обновите страницу и используйте кнопку «Сохранить»." }, { status: 409 });
  } catch (error) { return authErrorResponse(error); }
}
export { atomicEditorRequired as POST_NUTRIENT, atomicEditorRequired as PATCH_NUTRIENT, atomicEditorRequired as DELETE_NUTRIENT, atomicEditorRequired as POST_MEASURE, atomicEditorRequired as PATCH_MEASURE, atomicEditorRequired as DELETE_MEASURE };
