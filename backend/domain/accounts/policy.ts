export type AccessUser = { id: string; role: string };

export function ownerScope(user: AccessUser) {
  return user.role === "ADMIN" ? {} : { userId: user.id };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function canManageNutrients(user: AccessUser) {
  return user.role === "ADMIN";
}
