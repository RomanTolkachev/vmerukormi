import "server-only";

import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedValue] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedValue) return false;

  const expected = Buffer.from(expectedValue, "base64url");
  const actual = await scryptAsync(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

