type CatalogUser = { id: string; role: string };

export function readableCatalog(user: string | CatalogUser) {
  const userId = typeof user === "string" ? user : user.id;
  return typeof user !== "string" && user.role === "ADMIN" ? {} : { OR: [{ userId }, { isShared: true }] };
}

export function writableCatalog(user: CatalogUser) {
  return user.role === "ADMIN" ? {} : { OR: [{ userId: user.id, isShared: false }] };
}

export function canEditCatalog(record: { userId: string; isShared: boolean }, user: CatalogUser) {
  return user.role === "ADMIN" || (!record.isShared && record.userId === user.id);
}

export function catalogReferences(user: string | CatalogUser, isShared: boolean) {
  return isShared ? { isShared: true } : readableCatalog(user);
}
