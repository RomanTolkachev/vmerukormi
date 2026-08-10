import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { prisma } from "@backend/infrastructure/database/prisma";
import { CSRF_COOKIE, SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";

export type AuthUser = { id: string; username: string; role: UserRole };

export class AuthError extends Error {
  constructor(readonly status: 401 | 403, message: string) {
    super(message);
  }
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieOptions(httpOnly: boolean, expires: Date) {
  return {
    httpOnly,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    expires,
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSession(userId: string) {
  const sessionToken = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.session.create({
      data: {
        userId,
        tokenHash: tokenHash(sessionToken),
        csrfTokenHash: tokenHash(csrfToken),
        expiresAt,
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, cookieOptions(true, expiresAt));
  cookieStore.set(CSRF_COOKIE, csrfToken, cookieOptions(false, expiresAt));
}

export async function getSession() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(sessionToken) },
    include: { user: { select: { id: true, username: true, role: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getSession())?.user ?? null;
}

function verifySameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) throw new AuthError(403, "Недопустимый источник запроса");

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AuthError(403, "Недопустимый источник запроса");
  }
  if (!safeEqual(originHost, host)) throw new AuthError(403, "Недопустимый источник запроса");
}

export function requireSameOrigin(request: Request) {
  verifySameOrigin(request);
}

export async function requireUser(request: Request, options: { csrf?: boolean } = {}) {
  const session = await getSession();
  if (!session) throw new AuthError(401, "Требуется вход");

  if (options.csrf) {
    verifySameOrigin(request);
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
    const headerToken = request.headers.get("x-csrf-token");
    if (
      !cookieToken ||
      !headerToken ||
      !safeEqual(cookieToken, headerToken) ||
      !safeEqual(tokenHash(headerToken), session.csrfTokenHash)
    ) {
      throw new AuthError(403, "Некорректный CSRF-токен");
    }
  }

  return session.user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(sessionToken) } });
  }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
