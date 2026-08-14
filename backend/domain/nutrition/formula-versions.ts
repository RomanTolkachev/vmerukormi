export const FORMULA_OPEN_END = "2399-12-31T23:59:59.999Z";

export function formulaOpenEnd() {
  return new Date(FORMULA_OPEN_END);
}

export function formulaStart(value = new Date()) {
  return value;
}

export function dateTime(value: Date) {
  return value.toISOString();
}

export function isVersionCurrent(techBegin: Date, techEnd: Date, now = new Date()) {
  return techBegin <= now && techEnd > now;
}
