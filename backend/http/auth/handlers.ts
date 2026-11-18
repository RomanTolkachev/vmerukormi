import { z } from "zod";
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "@backend/auth/password";
import { prisma, rawPrisma, auditEvent } from "@backend/infrastructure/database/prisma";
import { setDatabaseActor } from "@backend/infrastructure/database/context";
import { accountSchema, emailSchema } from "@backend/domain/accounts/validation";
import { consumeCaptcha, issueCaptcha, rateLimit, requestIdentity } from "@backend/auth/abuse-protection";
import { authErrorResponse, createSession, deleteCurrentSession, getCurrentUser, requireSameOrigin, requireUser } from "@backend/auth/session";

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });

export async function login(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Введите email и пароль" }, { status: 400 });
    if (!(await rateLimit("login-ip", requestIdentity(request), 100)) || !(await rateLimit("login-email", parsed.data.email, 15))) {
      return Response.json({ error: "Слишком много попыток. Повторите через 15 минут." }, { status: 429 });
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? "scrypt$invalid-account$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    if (!user || !valid) {
      await rawPrisma.auditEvent.create({ data: { action: "LOGIN_FAILED", entityType: "User", after: { email: parsed.data.email } } });
      return Response.json({ error: "Неверный email или пароль" }, { status: 401 });
    }
    setDatabaseActor(user);
    await createSession(user.id);
    await auditEvent("LOGIN", "User", user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { return authErrorResponse(error); }
}

export async function logout(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    await auditEvent("LOGOUT", "User", user.id);
    await deleteCurrentSession();
    return new Response(null, { status: 204 });
  } catch (error) { return authErrorResponse(error); }
}

export async function me() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  return Response.json({ user });
}

export async function captcha(request: Request) {
  if (!(await rateLimit("captcha", requestIdentity(request), 60))) return Response.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  return Response.json(await issueCaptcha(), { headers: { "cache-control": "no-store" } });
}

export async function register(request: Request) {
  try {
    requireSameOrigin(request);
    if (!(await rateLimit("register", requestIdentity(request), 20))) return Response.json({ error: "Слишком много регистраций. Попробуйте через 15 минут." }, { status: 429 });
    const parsed = accountSchema.extend({ captcha: z.string().min(1).max(8000) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Укажите имя, корректный email, пароль от 6 символов и пройдите проверку." }, { status: 400 });
    if (!(await consumeCaptcha(parsed.data.captcha))) return Response.json({ error: "Пройдите проверку ещё раз: она истекла или уже использована." }, { status: 400 });
    const id = randomUUID();
    const { name, email, password } = parsed.data;
    setDatabaseActor({ id, email, role: "USER" });
    const user = await prisma.user.create({ data: { id, username: id, name, email, passwordHash: await hashPassword(password), role: "USER" } });
    await auditEvent("REGISTER", "User", id);
    await createSession(id);
    return Response.json({ user: { id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

