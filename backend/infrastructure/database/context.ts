import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@prisma/client";

export type DatabaseActor = { id: string; email: string; role: string };
export type DatabaseContext = { transaction: Prisma.TransactionClient; actor?: DatabaseActor; requestId?: string };
export const databaseContext = new AsyncLocalStorage<DatabaseContext>();

export function setDatabaseActor(actor: DatabaseActor) {
  const context = databaseContext.getStore();
  if (context) context.actor = actor;
}
