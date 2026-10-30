type CatalogUser = { id: string; role: string };

export function readableCatalog(userId: string) {
  return { OR: [{ userId }, { isShared: true }] };
}

export function writableCatalog(user: CatalogUser) {
  return { OR: [{ userId: user.id, isShared: false }, ...(user.role === "ADMIN" ? [{ isShared: true }] : [])] };
}

export function canEditCatalog(record: { userId: string; isShared: boolean }, user: CatalogUser) {
  return record.isShared ? user.role === "ADMIN" : record.userId === user.id;
}

export function catalogReferences(userId: string, isShared: boolean) {
  return isShared ? { isShared: true } : readableCatalog(userId);
}
