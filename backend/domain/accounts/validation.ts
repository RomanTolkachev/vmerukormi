import { z } from "zod";
import { normalizeEmail } from "./policy";

export const emailSchema = z.string().trim().max(254).email().transform(normalizeEmail);
export const passwordSchema = z.string().min(6).max(200);
export const accountSchema = z.object({ name: z.string().trim().min(1).max(80), email: emailSchema, password: passwordSchema });
