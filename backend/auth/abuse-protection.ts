import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { createChallenge, verifySolution, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/sha";
import { z } from "zod";
import { rawPrisma } from "@backend/infrastructure/database/prisma";

export async function rateLimit(scope: string, identity: string, limit: number, seconds = 900) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = createHash("sha256").update(scope + ":" + identity + ":" + bucket).digest("hex");
  const expiresAt = new Date((bucket + 1) * seconds * 1000);
  const record = await rawPrisma.authRateLimit.upsert({
    where: { key }, create: { key, attempts: 1, expiresAt }, update: { attempts: { increment: 1 } },
  });
  return record.attempts <= limit;
}

export function requestIdentity(request: Request) {
  return process.env.TRUST_PROXY === "true" ? request.headers.get("x-real-ip") ?? "unknown" : "local";
}

export async function issueCaptcha() {
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
  const secret = randomBytes(32).toString("hex");
  const challenge = await createChallenge({ algorithm: "SHA-256", cost: 1, keyPrefix: "0000", deriveKey, hmacSignatureSecret: secret, expiresAt });
  await rawPrisma.captchaChallenge.create({ data: { id: challenge.signature!, secret, expiresAt, challenge: challenge as unknown as Prisma.InputJsonValue } });
  await rawPrisma.captchaChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await rawPrisma.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return challenge;
}

const proofSchema = z.object({
  challenge: z.object({ signature: z.string().min(16).max(256) }),
  solution: z.object({ counter: z.number().int().min(0).max(4294967295), derivedKey: z.string().min(1).max(256) }),
});

export async function consumeCaptcha(payload: string) {
  try {
    if (payload.length > 8000) return false;
    const parsed = proofSchema.safeParse(JSON.parse(Buffer.from(payload, "base64").toString("utf8")));
    if (!parsed.success) return false;
    const stored = await rawPrisma.captchaChallenge.findUnique({ where: { id: parsed.data.challenge.signature } });
    if (!stored || stored.consumedAt || stored.expiresAt <= new Date()) return false;
    const checked = await verifySolution({ challenge: stored.challenge as unknown as Challenge, solution: parsed.data.solution, deriveKey, hmacSignatureSecret: stored.secret });
    if (!checked.verified) return false;
    const claimed = await rawPrisma.captchaChallenge.updateMany({
      where: { id: stored.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() },
    });
    return claimed.count === 1;
  } catch {
    return false;
  }
}
