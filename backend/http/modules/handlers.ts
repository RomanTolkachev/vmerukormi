import { NextResponse } from "next/server";
import { MODULES } from "@backend/domain/nutrition/modules";
import { authErrorResponse, requireUser } from "@backend/auth/session";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    return NextResponse.json(MODULES);
  } catch (error) {
    return authErrorResponse(error);
  }
}
