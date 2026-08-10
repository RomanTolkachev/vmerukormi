import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/infrastructure/database/prisma";
import { verifyPassword } from "@backend/auth/password";
import {
  authErrorResponse,
  createSession,
  deleteCurrentSession,
  getCurrentUser,
  requireSameOrigin,
  requireUser,
} from "@backend/auth/session";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function login(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Введите имя пользователя и пароль" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Неверное имя пользователя или пароль" }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function logout(request: Request) {
  try {
    await requireUser(request, { csrf: true });
    await deleteCurrentSession();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function me() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  return NextResponse.json({ user });
}

