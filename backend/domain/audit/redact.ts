const secretFields = /password|token|secret|authorization|cookie|captcha|signature/i;

export function redactAudit(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return typeof value === "bigint" ? String(value) : value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(redactAudit);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !secretFields.test(key)).map(([key, entry]) => [key, redactAudit(entry)]));
}
